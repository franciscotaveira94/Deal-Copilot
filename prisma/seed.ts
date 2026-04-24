/**
 * Seed with Gunnercooke + Monument based on the Claude conversations.
 * Run: npx tsx prisma/seed.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  // clear existing (safe - this is seed, not prod)
  await prisma.chatMessage.deleteMany({});
  await prisma.action.deleteMany({});
  await prisma.timelineEntry.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.account.deleteMany({});

  // =====================
  // MONUMENT
  // =====================
  const monument = await prisma.account.create({
    data: {
      name: "Monument Technology",
      domain: "monument.tech",
      industry: "Financial services / Wealth management",
      stage: "negotiation",
      priority: "high",
      arr: 3_60_000, // $3,600/year = $360,000 cents
      summary:
        "Enterprise Turnstile deal at 500k calls/month. CTO signed off. Order form out for signature. Price correction from initial $281/mo estimate to $300/mo CPQ output flagged to Diptesh (CTO rep). Lever to hit $281 is re-sizing to 470k/mo; headroom trade-off communicated.",
      nextAction: "Confirm which sizing Diptesh wants (500k @ $300 or 470k @ $281); reissue order form if needed",
      nextActionDue: new Date(Date.now() + 2 * 24 * 3600 * 1000),
      lastTouch: new Date(),
      notes:
        "Lead Web Developer: Mark Mizen. CTO rep on paperwork: Diptesh Mishra. Billing: Craig Cumming (procurement@monumentbc.uk). Billing CCs: bianca.giorgetti, diptesh.mishra, craig.cumming. Company No 15281121, VAT (GB)464183386. Address: 33 Cavendish Square, London W1G 0PW.\n\nScaling plans to 20-50 clients. SaaS platform model. Used partner-channel originally but can transact direct.",
      contacts: {
        create: [
          { name: "Mark Mizen", role: "Lead Web Developer", email: "mark.mizen@monument.tech" },
          { name: "Diptesh Mishra", role: "CTO rep / paperwork", email: "diptesh.mishra@monument.tech" },
          { name: "Craig Cumming", role: "Billing contact", email: "procurement@monumentbc.uk" },
          { name: "Bianca Giorgetti", role: "Billing CC", email: "bianca.giorgetti@monument.tech" },
        ],
      },
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        accountId: monument.id,
        kind: "email",
        title: "Initial pricing & Enterprise benefits email",
        occurredAt: new Date("2026-04-14T14:21:00Z"),
        summary:
          "Sent Mark full pricing proposal (~$281/mo for 500k, ~$562 for 1M, ~$760 for 2M). Laid out Enterprise Turnstile benefits: unlimited widgets, 200 hostnames/widget, any-hostname widget, off-label mode, 30-day analytics, Ephemeral ID, SaaS platform support, Enterprise SLA/support. Flagged their website appeared down. Recommended sizing above current needs to avoid repeat procurement.",
        sentiment: "positive",
        source: "manual",
        content:
          "Hi Mark,\n\nThank you for the session earlier. As promised, here's everything we discussed.\n\nPricing - Based on 500k calls per month, you'd be looking at approximately $281/month, billed annually.\n\nOptions: 500k @ $281, 1M @ $562, 2M @ $760 (2-year term).\n\nEnterprise Turnstile benefits: Unlimited widgets, up to 200 hostnames/widget, Any-hostname widget, Off-label mode, 30-day analytics lookback, Ephemeral ID, SaaS platform support, Enterprise support and SLAs.\n\nPer-Client Analytics/Cost Itemization: checking internally. Depending on option, may transact directly rather than through partner. PS: noticed website appears down.",
      },
      {
        accountId: monument.id,
        kind: "email",
        title: "Mark acknowledges - needs time, team in release",
        occurredAt: new Date("2026-04-17T08:49:00Z"),
        summary: "Mark apologised for delay, team had unexpected release effort, committed to end-of-day update.",
        sentiment: "neutral",
        source: "manual",
        content: "A release ended up taking a lot more effort than originally thought by me and the team so only just coming back to this now. I will try get back to you by the end of today with an update!",
      },
      {
        accountId: monument.id,
        kind: "milestone",
        title: "CTO signed off",
        occurredAt: new Date("2026-04-22T10:41:00Z"),
        summary: "Mark confirmed CTO has signed off. Getting internal next-steps assistance. Target end-of-week to close.",
        sentiment: "positive",
        source: "manual",
        content: "The CTO has signed off on this, this morning. I am just getting some assistance on what the next steps are internally, but we should be able to get this done by the end of the week🤞",
      },
      {
        accountId: monument.id,
        kind: "email",
        title: "Billing details + proceed with 500k",
        occurredAt: new Date("2026-04-24T09:17:00Z"),
        summary:
          "Mark sent billing details and confirmed 500k option. Diptesh Mishra listed as paperwork contact. Include Bianca, Diptesh, Craig on invoice CCs.",
        sentiment: "positive",
        source: "manual",
        content:
          "We would like to proceed with getting this account set up for 500k calls a month.\n\nBilling Contact: Craig Cumming\nBilling Email: procurement@monumentbc.uk (CC bianca.giorgetti, diptesh.mishra, craig.cumming)\nCompany No: 15281121\nVAT ID: (GB)464183386\nBilling Address: Monument Technology Limited, 33 Cavendish Square, London W1G 0PW, UK\n\nPlease send any enterprise agreement or other documents to sign to Diptesh Mishra.",
      },
      {
        accountId: monument.id,
        kind: "decision",
        title: "CPQ output $300/mo vs $281 estimate — flagged to Diptesh",
        occurredAt: new Date("2026-04-24T12:00:00Z"),
        summary:
          "Diptesh queried the $300 order form vs $281 email. Sent honest reply: $281 was pre-quote estimate; CPQ final is $300. Only lever to hit $281 exactly is resizing commit to 470k/mo (trade-off: less headroom, risk of overage). Awaiting decision.",
        sentiment: "at-risk",
        source: "manual",
        content:
          "Reply sent to Diptesh:\n\nThe $281 I shared with Mark was flagged as an approximate estimate ahead of the official quote. Pre-quote figures are always directional — final pricing comes from our CPQ system once the deal is built out. For 500k/month, that landed at $300/month billed annually.\n\nThere is one lever to hit $281 exactly: sizing the commit at 470k/month instead of 500k. Same package, same per-unit rate — just a smaller monthly commitment.\n\nWorth flagging: in my original note to Mark I recommended sizing just above current needs so Monument isn't caught short as you scale. At 470k you'd have less headroom before hitting overages. The $19/month delta buys that buffer.\n\nHappy either way — let me know which you'd prefer and I'll action accordingly.",
      },
    ],
  });

  await prisma.action.createMany({
    data: [
      {
        accountId: monument.id,
        title: "Wait for Diptesh decision on 500k@$300 vs 470k@$281",
        detail: "If 470k, reissue order form via CPQ. If 500k, proceed with current order form.",
        dueAt: new Date(Date.now() + 2 * 24 * 3600 * 1000),
        priority: "high",
      },
      {
        accountId: monument.id,
        title: "Confirm final signature path (direct vs partner)",
        dueAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        priority: "medium",
      },
      {
        accountId: monument.id,
        title: "Prep Per-Client Analytics/Cost Itemization response",
        detail: "Mark asked about this in original email; checking internally.",
        priority: "low",
      },
    ],
  });

  // =====================
  // GUNNERCOOKE
  // =====================
  const gunnercooke = await prisma.account.create({
    data: {
      name: "Gunnercooke LLP",
      domain: "gunnercooke.com",
      industry: "Legal / Professional services",
      stage: "discovery",
      priority: "medium",
      arr: 0,
      summary:
        "Zero trust re-engagement after 2024 cycle went dark. Third AE on the account. Project deferred until mid-to-late September due to finance-system bedding in + device enrolment (30% remaining). Cyber Essentials Plus is the compliance driver. Low urgency, long cycle. Needs requalifying, not re-pitching.",
      nextAction: "Send tailored zero trust brief; lock Oct touchpoint invite",
      nextActionDue: new Date(Date.now() + 1 * 24 * 3600 * 1000),
      lastTouch: new Date("2026-04-24"),
      notes:
        "Primary contact: Phil Marshall (Lead in Manchester). Prior contacts: David Juel (Cloudflare, left), Shaz Carmali (Cloudflare, left), Callum (CF ZT specialist - still there), Chris Whitehall (CDS partner).\n\nPrior history (2024): Full sales cycle through CDS partner. Demo delivered 15 Nov 2024. Proposal with 3 pricing tiers ($36k/$70k/$100k). Customer went dark Nov-Dec 2024. Closed-lost Apr 2025.\n\nApril 2026 call: friendly, low-urgency. Phil 'not really sure' what he wanted from the meeting. Agreed phased approach, Oct touchpoint, then tech session with Callum.\n\nEnvironment (from 2024 CDS notes, to validate): 500 staff, 11 locations, 100% cloud, M365/SharePoint, Data RMM, no VPN, conditional access + impossible travel on M365.",
      contacts: {
        create: [
          { name: "Phil Marshall", role: "Lead / Manchester", email: "philip.marshall@gunnercooke.com" },
          { name: "Callum (Cloudflare ZT specialist)", role: "Internal" },
          { name: "Chris Whitehall", role: "CDS partner rep", email: "" },
        ],
      },
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        accountId: gunnercooke.id,
        kind: "milestone",
        title: "Account history: closed-lost Apr 2025 after going dark",
        occurredAt: new Date("2025-04-02"),
        summary:
          "Previous AE (David Jewell) closed the opp lost in April 2025 after multiple chaser attempts. CDS hadn't heard from customer since early January. Customer never formally declined — just went silent after Dec 2024 budget decision.",
        sentiment: "negative",
        source: "manual",
        content:
          "From David Jewell's forecast comments:\n\n2/04/2025: No response to multiple chasers after inheriting the opp from DJ. CDS have not heard anything since early January. Will close next week if no response.\n\n19/12/24: Negative - Not going to happen this year but will likely land early Q1.\n\n12/12/24: Negative - No sign of customer answering either calls or emails from Chris since his return on Monday.\n\n26/11/24: Neutral - All pricing and decision making is with the customer. Cheapest is $36k, highest is $100k. Believe customer will choose mid range ~$70k.",
      },
      {
        accountId: gunnercooke.id,
        kind: "meeting",
        title: "Re-engagement call — Phil Marshall",
        occurredAt: new Date("2026-04-24"),
        summary:
          "Phil was polite but unsure what he wanted from the meeting. Confirmed zero trust project is still budgeted and on roadmap but won't move for 3+ months. Prerequisites: finish device enrolment (30% remaining) at Sept conference, progress Cyber Essentials Plus. Finance system programme freed up resources. Agreed to 20-min October touchpoint and recommended phased approach (Access → Gateway → DLP). Phil previously worked with David Juel (gone), Shaz Carmali (gone), Callum (still there), and Chris Whitehall at CDS.",
        sentiment: "neutral",
        source: "manual",
        content:
          "Key moments from transcript:\n\n- Phil: 'been chatting actually to one of your resellers... about 18 months ago, two years' (but did not mention prior proposal / demo / pricing tiers)\n- Phil: 'not going to happen in the next three months'\n- Phil: 'realistically nothing's going to happen until probably mid to late September'\n- Phil: 'Cyber Essentials Plus... zero trust is a big part of that'\n- Phil: had 3-year finance system implementation consumed all resources, went live October, still bedding in\n- I pitched phased approach (Access → Gateway → DLP) and the 4-quadrant portfolio slide (too early in hindsight)\n- Agreed: 20-min touchpoint first week of October, send materials\n- Minor miss: I pitched VPN replacement as entry point, but from 2024 notes Gunnercooke have 'no VPN' — need to reframe around SaaS/partner access in October",
      },
    ],
  });

  await prisma.action.createMany({
    data: [
      {
        accountId: gunnercooke.id,
        title: "Send tailored zero trust brief (PDF on Desktop)",
        detail: "Gunnercooke_Zero_Trust_Brief.pdf — pre-read for Oct touchpoint.",
        dueAt: new Date(Date.now() + 1 * 24 * 3600 * 1000),
        priority: "high",
      },
      {
        accountId: gunnercooke.id,
        title: "Send 20-min calendar invite for first week of October",
        dueAt: new Date(Date.now() + 1 * 24 * 3600 * 1000),
        priority: "high",
      },
      {
        accountId: gunnercooke.id,
        title: "Sync with Chris Whitehall at CDS — is this still live for him?",
        detail: "Before October call. Critical: CDS did a full cycle in 2024 and got burned. Do they still want back in? Are they the right partner path going forward?",
        priority: "high",
      },
      {
        accountId: gunnercooke.id,
        title: "Pull 2024 proposal + demo notes from Callum / David Jewell archive",
        detail: "Avoid walking into October blind to prior pitch and objections.",
        priority: "medium",
      },
      {
        accountId: gunnercooke.id,
        title: "Light-touch value email in July (1 piece of relevant content)",
        detail: "Keep warm without chasing. CE+ alignment piece or relevant peer case study.",
        dueAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
        priority: "low",
      },
      {
        accountId: gunnercooke.id,
        title: "Reset internal forecast: this is FY+1, not current FY",
        detail: "Don't defend this in QBRs as a current-FY deal. Re-stage as requalify.",
        priority: "medium",
      },
    ],
  });

  console.log("Seed complete.");
  console.log(`- Monument: ${monument.id}`);
  console.log(`- Gunnercooke: ${gunnercooke.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
