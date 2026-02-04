import { google } from 'googleapis';
import { db } from '@/lib/db';
import { users, notes, voiceNotes, digestItems, digests, docExports } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';
import { getRequiredEnv } from '@/lib/env';

type DocsRequest = {
  insertText?: {
    location: { index: number };
    text: string;
  };
  updateTextStyle?: {
    range: { startIndex: number; endIndex: number };
    textStyle: Record<string, any>;
    fields: string;
  };
  updateParagraphStyle?: {
    range: { startIndex: number; endIndex: number };
    paragraphStyle: Record<string, any>;
    fields: string;
  };
};

/**
 * Get an authenticated Google Docs client for a user.
 */
function getDocsClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    getRequiredEnv('GOOGLE_CLIENT_ID'),
    getRequiredEnv('GOOGLE_CLIENT_SECRET'),
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.docs({ version: 'v1', auth: oauth2Client });
}

function getDriveClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    getRequiredEnv('GOOGLE_CLIENT_ID'),
    getRequiredEnv('GOOGLE_CLIENT_SECRET'),
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Create the user's learning log Google Doc.
 * Called once during onboarding.
 */
export async function createLearningLogDoc(
  userId: string,
  userName: string,
  accessToken: string,
  refreshToken: string,
): Promise<string> {
  const docs = getDocsClient(accessToken, refreshToken);

  const doc = await docs.documents.create({
    requestBody: {
      title: `${userName}'s Learning Log`,
    },
  });

  const docId = doc.data.documentId!;

  // Add a title and intro paragraph
  const requests: DocsRequest[] = [
    {
      insertText: {
        location: { index: 1 },
        text: `${userName}'s Learning Log\n\nThis document is automatically updated with your daily reflections from your Personal Daily Brief.\n\n`,
      },
    },
    {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: userName.length + "'s Learning Log".length + 2 },
        paragraphStyle: { namedStyleType: 'HEADING_1' },
        fields: 'namedStyleType',
      },
    },
  ];

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests: requests as any },
  });

  // Store the doc ID
  await db.update(users).set({
    googleDocId: docId,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  return docId;
}

/**
 * Append today's reflections to the user's learning log.
 * Idempotent: tracks which notes have been exported.
 */
export async function appendReflectionsToDoc(userId: string): Promise<{ exported: number }> {
  // Get user with tokens and doc ID
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.googleDocId || !user.googleAccessToken || !user.googleRefreshToken) {
    throw new Error('User not found or missing Google credentials/doc');
  }

  // Get unexported notes for this user
  const unexportedNotes = await db.select({
    note: notes,
    item: digestItems,
    digest: digests,
  })
    .from(notes)
    .innerJoin(digestItems, eq(notes.digestItemId, digestItems.id))
    .innerJoin(digests, eq(digestItems.digestId, digests.id))
    .where(and(
      eq(notes.userId, userId),
      eq(notes.exportedToDoc, false),
    ))
    .orderBy(digests.digestDate, digestItems.position);

  if (unexportedNotes.length === 0) {
    return { exported: 0 };
  }

  // Get voice notes for any voice reflections
  const voiceNoteIds = unexportedNotes
    .filter(n => n.note.noteType === 'voice')
    .map(n => n.note.id);

  const voiceNotesData = voiceNoteIds.length > 0
    ? await db.select().from(voiceNotes).where(
        inArray(voiceNotes.noteId, voiceNoteIds)
      )
    : [];

  const voiceNoteMap = new Map(voiceNotesData.map(v => [v.noteId, v]));

  // Group notes by date
  const notesByDate = new Map<string, typeof unexportedNotes>();
  for (const entry of unexportedNotes) {
    const dateStr = entry.digest.digestDate;
    if (!notesByDate.has(dateStr)) {
      notesByDate.set(dateStr, []);
    }
    notesByDate.get(dateStr)!.push(entry);
  }

  // Build the content to append
  const docs = getDocsClient(user.googleAccessToken, user.googleRefreshToken);

  // Get current document length
  const docData = await docs.documents.get({ documentId: user.googleDocId });
  let insertIndex = (docData.data.body?.content?.slice(-1)?.[0]?.endIndex || 1) - 1;

  const requests: any[] = [];

  for (const [dateStr, dateNotes] of notesByDate) {
    const dateHeading = `\n${formatDate(dateStr)}\n`;
    requests.push({
      insertText: {
        location: { index: insertIndex },
        text: dateHeading,
      },
    });

    const headingStart = insertIndex + 1;
    const headingEnd = insertIndex + dateHeading.length;
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: headingStart, endIndex: headingEnd - 1 },
        paragraphStyle: { namedStyleType: 'HEADING_2' },
        fields: 'namedStyleType',
      },
    });
    insertIndex += dateHeading.length;

    for (const entry of dateNotes) {
      // Article title (H3)
      const titleText = `\n${entry.item.title}\n`;
      requests.push({
        insertText: {
          location: { index: insertIndex },
          text: titleText,
        },
      });
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: insertIndex + 1, endIndex: insertIndex + titleText.length - 1 },
          paragraphStyle: { namedStyleType: 'HEADING_3' },
          fields: 'namedStyleType',
        },
      });
      insertIndex += titleText.length;

      // Source link
      const sourceLinks = (entry.item.sourceLinks as any[]) || [];
      const primaryLink = sourceLinks[0]?.url || '';
      if (primaryLink) {
        const linkText = `Source: ${primaryLink}\n`;
        requests.push({
          insertText: {
            location: { index: insertIndex },
            text: linkText,
          },
        });
        requests.push({
          updateTextStyle: {
            range: { startIndex: insertIndex + 8, endIndex: insertIndex + 8 + primaryLink.length },
            textStyle: {
              link: { url: primaryLink },
              foregroundColor: { color: { rgbColor: { red: 0.06, green: 0.45, blue: 0.73 } } },
            },
            fields: 'link,foregroundColor',
          },
        });
        insertIndex += linkText.length;
      }

      // Summary (italics)
      const summaryText = `${entry.item.summary}\n`;
      requests.push({
        insertText: {
          location: { index: insertIndex },
          text: summaryText,
        },
      });
      requests.push({
        updateTextStyle: {
          range: { startIndex: insertIndex, endIndex: insertIndex + summaryText.length - 1 },
          textStyle: { italic: true },
          fields: 'italic',
        },
      });
      insertIndex += summaryText.length;

      // User reflection
      const reflectionContent = entry.note.textContent || '';
      if (reflectionContent) {
        const reflectionText = `\nMy Reflection:\n${reflectionContent}\n`;
        requests.push({
          insertText: {
            location: { index: insertIndex },
            text: reflectionText,
          },
        });
        // Bold "My Reflection:" label
        requests.push({
          updateTextStyle: {
            range: { startIndex: insertIndex + 1, endIndex: insertIndex + 15 },
            textStyle: { bold: true },
            fields: 'bold',
          },
        });
        insertIndex += reflectionText.length;
      }

      // Voice note link (if applicable)
      const vNote = voiceNoteMap.get(entry.note.id);
      if (vNote?.audioUrl) {
        const audioText = `🎙 Listen to voice note\n`;
        requests.push({
          insertText: {
            location: { index: insertIndex },
            text: audioText,
          },
        });
        insertIndex += audioText.length;
      }

      // Separator
      const sep = '\n───────────────────\n';
      requests.push({
        insertText: {
          location: { index: insertIndex },
          text: sep,
        },
      });
      insertIndex += sep.length;
    }
  }

  // Execute batch update
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: user.googleDocId,
      requestBody: { requests },
    });
  }

  // Mark notes as exported
  const noteIds = unexportedNotes.map(n => n.note.id);
  for (const noteId of noteIds) {
    await db.update(notes).set({
      exportedToDoc: true,
      exportedAt: new Date(),
    }).where(eq(notes.id, noteId));
  }

  // Log the export
  await db.insert(docExports).values({
    userId,
    exportDate: new Date().toISOString().split('T')[0],
    notesExported: noteIds.length,
    status: 'success',
  });

  return { exported: noteIds.length };
}
