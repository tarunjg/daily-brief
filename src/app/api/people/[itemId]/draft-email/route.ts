import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { digestItems, digests, outboundEmails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { draftOutboundEmail } from '@/lib/prompts/generate';
import { bestEmail } from '@/lib/research/discover';
import type { CandidateEmail, PersonItem, SourceLink } from '@/types';

interface Params {
  params: { itemId: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  // Load the item and confirm it belongs to this user and is a person card.
  const [row] = await db.select({
    item: digestItems,
    ownerId: digests.userId,
  })
    .from(digestItems)
    .innerJoin(digests, eq(digestItems.digestId, digests.id))
    .where(eq(digestItems.id, params.itemId))
    .limit(1);

  if (!row || row.ownerId !== userId) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
  if (row.item.itemType !== 'person') {
    return NextResponse.json({ success: false, error: 'Item is not a person' }, { status: 400 });
  }

  // Return a cached draft if one exists (unless ?regenerate=1).
  const regenerate = req.nextUrl.searchParams.get('regenerate') === '1';
  const [existing] = await db.select()
    .from(outboundEmails)
    .where(eq(outboundEmails.digestItemId, params.itemId))
    .limit(1);
  if (existing && !regenerate) {
    return NextResponse.json({
      success: true,
      data: { toEmail: existing.toEmail, subject: existing.subject, body: existing.body },
    });
  }

  const item = row.item;
  const candidateEmails = (item.candidateEmails as CandidateEmail[]) || [];
  const person: PersonItem = {
    position: item.position,
    personName: item.personName || '',
    personRole: item.personRole || '',
    companyName: item.companyName || '',
    companyOneLiner: item.companyOneLiner || '',
    whyMeet: item.whyMeet || item.whyItMatters || '',
    ceoCpoName: item.ceoCpoName || '',
    ceoCpoRole: item.ceoCpoRole || '',
    companyDomain: item.companyDomain || null,
    domainMailable: item.domainMailable ?? false,
    mailProvider: item.mailProvider || null,
    candidateEmails,
    linkedinUrl: item.linkedinUrl || null,
    sourceLinks: (item.sourceLinks as SourceLink[]) || [],
  };

  const toEmail = bestEmail(candidateEmails);

  try {
    const draft = await draftOutboundEmail(person, toEmail);

    // Upsert so concurrent/double requests can't violate the unique constraint.
    await db.insert(outboundEmails).values({
      digestItemId: params.itemId,
      userId,
      toEmail: draft.toEmail,
      subject: draft.subject,
      body: draft.body,
    }).onConflictDoUpdate({
      target: outboundEmails.digestItemId,
      set: {
        toEmail: draft.toEmail,
        subject: draft.subject,
        body: draft.body,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: draft });
  } catch (error) {
    console.error('[DraftEmail] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to draft email' }, { status: 500 });
  }
}
