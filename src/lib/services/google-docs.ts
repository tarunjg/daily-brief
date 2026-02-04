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
  const firstName = userName.split(' ')[0];

  const doc = await docs.documents.create({
    requestBody: {
      title: `${firstName}'s Learning Log — Daily Brief`,
    },
  });

  const docId = doc.data.documentId!;

  // Build a beautiful cover page
  const titleText = `${firstName}'s Learning Log\n`;
  const subtitleText = `A Personal Knowledge Journal\n`;
  const introText = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  const welcomeText = `Welcome to your learning log.\n\n`;
  const descText = `This is your personal space for capturing insights, reflections, and ideas from your Daily Brief. Each entry represents a moment where something resonated with you — a connection made, a question raised, or an insight gained.\n\n`;
  const howToText = `How to use this document:\n`;
  const bullet1 = `    •  Review your reflections periodically to spot patterns in your thinking\n`;
  const bullet2 = `    •  Search for topics or themes when you need to recall past insights\n`;
  const bullet3 = `    •  Add to entries as your understanding evolves\n`;
  const bullet4 = `    •  Share specific entries with colleagues when relevant\n\n`;
  const closingLine = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  const entriesHeader = `Reflections & Insights\n\n`;

  const fullText = titleText + subtitleText + introText + welcomeText + descText +
                   howToText + bullet1 + bullet2 + bullet3 + bullet4 + closingLine + entriesHeader;

  const requests: any[] = [
    {
      insertText: {
        location: { index: 1 },
        text: fullText,
      },
    },
    // Title styling - large, bold
    {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: titleText.length + 1 },
        paragraphStyle: {
          namedStyleType: 'HEADING_1',
          alignment: 'CENTER',
        },
        fields: 'namedStyleType,alignment',
      },
    },
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: titleText.length },
        textStyle: {
          fontSize: { magnitude: 28, unit: 'PT' },
          foregroundColor: { color: { rgbColor: { red: 0.2, green: 0.2, blue: 0.25 } } },
        },
        fields: 'fontSize,foregroundColor',
      },
    },
    // Subtitle styling
    {
      updateParagraphStyle: {
        range: { startIndex: titleText.length + 1, endIndex: titleText.length + subtitleText.length + 1 },
        paragraphStyle: { alignment: 'CENTER' },
        fields: 'alignment',
      },
    },
    {
      updateTextStyle: {
        range: { startIndex: titleText.length + 1, endIndex: titleText.length + subtitleText.length },
        textStyle: {
          fontSize: { magnitude: 14, unit: 'PT' },
          foregroundColor: { color: { rgbColor: { red: 0.5, green: 0.5, blue: 0.55 } } },
          italic: true,
        },
        fields: 'fontSize,foregroundColor,italic',
      },
    },
    // "How to use" bold
    {
      updateTextStyle: {
        range: {
          startIndex: titleText.length + subtitleText.length + introText.length + welcomeText.length + descText.length + 1,
          endIndex: titleText.length + subtitleText.length + introText.length + welcomeText.length + descText.length + howToText.length
        },
        textStyle: { bold: true },
        fields: 'bold',
      },
    },
    // "Reflections & Insights" header
    {
      updateParagraphStyle: {
        range: {
          startIndex: fullText.length - entriesHeader.length + 1,
          endIndex: fullText.length
        },
        paragraphStyle: { namedStyleType: 'HEADING_1' },
        fields: 'namedStyleType',
      },
    },
    {
      updateTextStyle: {
        range: {
          startIndex: fullText.length - entriesHeader.length + 1,
          endIndex: fullText.length - 2
        },
        textStyle: {
          fontSize: { magnitude: 20, unit: 'PT' },
          foregroundColor: { color: { rgbColor: { red: 0.2, green: 0.2, blue: 0.25 } } },
        },
        fields: 'fontSize,foregroundColor',
      },
    },
  ];

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests },
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
    // Beautiful date header with decorative elements
    const formattedDate = formatDate(dateStr);
    const dateHeading = `\n◆  ${formattedDate}\n`;
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
    // Style the date with a nice color
    requests.push({
      updateTextStyle: {
        range: { startIndex: headingStart, endIndex: headingEnd - 1 },
        textStyle: {
          foregroundColor: { color: { rgbColor: { red: 0.29, green: 0.47, blue: 0.64 } } },
          fontSize: { magnitude: 16, unit: 'PT' },
        },
        fields: 'foregroundColor,fontSize',
      },
    });
    insertIndex += dateHeading.length;

    for (const entry of dateNotes) {
      // Topics as inline tags
      const topics = entry.item.topics || [];
      if (topics.length > 0) {
        const topicsText = `${topics.slice(0, 3).map((t: string) => `#${t}`).join('  ')}\n`;
        requests.push({
          insertText: {
            location: { index: insertIndex },
            text: topicsText,
          },
        });
        requests.push({
          updateTextStyle: {
            range: { startIndex: insertIndex, endIndex: insertIndex + topicsText.length - 1 },
            textStyle: {
              fontSize: { magnitude: 9, unit: 'PT' },
              foregroundColor: { color: { rgbColor: { red: 0.55, green: 0.55, blue: 0.6 } } },
            },
            fields: 'fontSize,foregroundColor',
          },
        });
        insertIndex += topicsText.length;
      }

      // Article title - clean, bold heading
      const titleText = `${entry.item.title}\n`;
      requests.push({
        insertText: {
          location: { index: insertIndex },
          text: titleText,
        },
      });
      requests.push({
        updateTextStyle: {
          range: { startIndex: insertIndex, endIndex: insertIndex + titleText.length - 1 },
          textStyle: {
            bold: true,
            fontSize: { magnitude: 13, unit: 'PT' },
            foregroundColor: { color: { rgbColor: { red: 0.15, green: 0.15, blue: 0.2 } } },
          },
          fields: 'bold,fontSize,foregroundColor',
        },
      });
      insertIndex += titleText.length;

      // Summary in a refined style
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
          textStyle: {
            italic: true,
            fontSize: { magnitude: 10, unit: 'PT' },
            foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.45 } } },
          },
          fields: 'italic,fontSize,foregroundColor',
        },
      });
      insertIndex += summaryText.length;

      // User reflection - the heart of the entry
      const reflectionContent = entry.note.textContent || '';
      if (reflectionContent) {
        const reflectionLabel = `\n💭 My Thinking:\n`;
        const reflectionBody = `"${reflectionContent}"\n`;

        requests.push({
          insertText: {
            location: { index: insertIndex },
            text: reflectionLabel,
          },
        });
        requests.push({
          updateTextStyle: {
            range: { startIndex: insertIndex + 1, endIndex: insertIndex + reflectionLabel.length - 1 },
            textStyle: {
              bold: true,
              fontSize: { magnitude: 10, unit: 'PT' },
              foregroundColor: { color: { rgbColor: { red: 0.29, green: 0.47, blue: 0.64 } } },
            },
            fields: 'bold,fontSize,foregroundColor',
          },
        });
        insertIndex += reflectionLabel.length;

        requests.push({
          insertText: {
            location: { index: insertIndex },
            text: reflectionBody,
          },
        });
        // Style the reflection text with left indent and subtle background feel
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: insertIndex, endIndex: insertIndex + reflectionBody.length },
            paragraphStyle: {
              indentStart: { magnitude: 18, unit: 'PT' },
              indentEnd: { magnitude: 18, unit: 'PT' },
            },
            fields: 'indentStart,indentEnd',
          },
        });
        requests.push({
          updateTextStyle: {
            range: { startIndex: insertIndex, endIndex: insertIndex + reflectionBody.length - 1 },
            textStyle: {
              fontSize: { magnitude: 11, unit: 'PT' },
              foregroundColor: { color: { rgbColor: { red: 0.2, green: 0.2, blue: 0.25 } } },
            },
            fields: 'fontSize,foregroundColor',
          },
        });
        insertIndex += reflectionBody.length;
      }

      // Source link - subtle at the bottom
      const sourceLinks = (entry.item.sourceLinks as any[]) || [];
      const primaryLink = sourceLinks[0]?.url || '';
      if (primaryLink) {
        const linkText = `→ Read source\n`;
        requests.push({
          insertText: {
            location: { index: insertIndex },
            text: linkText,
          },
        });
        requests.push({
          updateTextStyle: {
            range: { startIndex: insertIndex, endIndex: insertIndex + linkText.length - 1 },
            textStyle: {
              link: { url: primaryLink },
              fontSize: { magnitude: 9, unit: 'PT' },
              foregroundColor: { color: { rgbColor: { red: 0.29, green: 0.47, blue: 0.64 } } },
            },
            fields: 'link,fontSize,foregroundColor',
          },
        });
        insertIndex += linkText.length;
      }

      // Voice note indicator
      const vNote = voiceNoteMap.get(entry.note.id);
      if (vNote?.audioUrl) {
        const audioText = `🎙 Recorded voice note\n`;
        requests.push({
          insertText: {
            location: { index: insertIndex },
            text: audioText,
          },
        });
        requests.push({
          updateTextStyle: {
            range: { startIndex: insertIndex, endIndex: insertIndex + audioText.length - 1 },
            textStyle: {
              fontSize: { magnitude: 9, unit: 'PT' },
              foregroundColor: { color: { rgbColor: { red: 0.55, green: 0.55, blue: 0.6 } } },
            },
            fields: 'fontSize,foregroundColor',
          },
        });
        insertIndex += audioText.length;
      }

      // Elegant separator
      const sep = `\n· · ·\n\n`;
      requests.push({
        insertText: {
          location: { index: insertIndex },
          text: sep,
        },
      });
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: insertIndex + 1, endIndex: insertIndex + sep.length - 1 },
          paragraphStyle: { alignment: 'CENTER' },
          fields: 'alignment',
        },
      });
      requests.push({
        updateTextStyle: {
          range: { startIndex: insertIndex + 1, endIndex: insertIndex + sep.length - 2 },
          textStyle: {
            foregroundColor: { color: { rgbColor: { red: 0.7, green: 0.7, blue: 0.75 } } },
          },
          fields: 'foregroundColor',
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
