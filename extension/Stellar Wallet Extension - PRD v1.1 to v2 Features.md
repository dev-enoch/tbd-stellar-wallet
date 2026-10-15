# Stellar Wallet Extension - PRD: v1.1 to v2 Features

*Draft v0.1 · October 15, 2026 · Author: Enoch · Companion to the v1 PRD*

## 1. Overview

This document covers six features deferred from v1. Each has its own requirements, design brief, metrics, and release gate.

| Release | Feature | Priority | Key decision |
| --- | --- | --- | --- |
| v1.1 | Third-party malicious transaction scanning | P1 | Evaluate providers, then pick one |
| v1.1 | Ledger support | P2 | Decide what may be signed on-device |
| v1.1 | Hausa interface | P2 | Find qualified reviewers |
| v1.2 | Dashboard: PnL, price alerts, order history | P2 | Choose price and history data sources |
| v2 | Passkey smart account with sponsored fees | P2 | Extension-compatible passkey design |
| v2 | Naira on/off-ramp through anchors | P2 | Legal opinion and a licensed anchor partner |

**Three recommendations up front**

1. **Build an account abstraction into v1 code now.** Ledger and passkey accounts sign differently from a local key. If v1 hard-codes local keys, v1.1 and v2 become rewrites (see section 3).
2. **Launch the ramp for standard accounts first.** Anchor flows may not yet work with smart-contract accounts, so the ramp should not wait on, or depend on, the passkey feature.
3. **Treat scanning as an evaluation with a decision gate, not a commitment.** Provider access, price, and privacy terms are unknown until you ask.

## 2. Research notes (as of October 2026; verify before relying on them)

- **Scanning:** Freighter and LOBSTR are reported to use Blockaid for transaction scanning. A Merkle Science project funded through SCF plans risk-screening APIs and a security SDK for Stellar wallets. At least one open-source wallet (Lantern, self-described) claims its own on-device scanning engine. Whether a new wallet can get access to these services, and on what terms, is not confirmed.
- **Ledger:** Classic Stellar operations (payments, trustlines, offers) display in readable form on Ledger's Stellar app. Soroban contract calls are mostly blind signing today, and a community proposal for clear-signing descriptors exists but is not a standard yet. Freighter lists Ledger support.
- **Passkeys:** Protocol 21 added native secp256r1 verification in Soroban, so a passkey can authorize transactions. Building blocks exist: OpenZeppelin smart account contracts, passkey-kit, smart-account-kit, and a passkey module in progress for the Stellar Wallets Kit. SDF's Meridian Pay and Orbi are reported to use passkey smart accounts. Fees can be sponsored by fee-bump transactions or by a relayer (OpenZeppelin offers a managed one).
- **Competitors to watch:** Lantern (security-first, open source), Beans, Orbi, Meridian Pay, and Neon Wallet's planned Stellar support.
- **Nigeria:** The SEC published draft rules on digital asset operations, custody, and markets on 20 August 2026, with consultation ending 3 September. Providers enter through the Accelerated Regulatory Incubation Program (ARIP). The draft reportedly sets a minimum capital of N200 million for service providers other than exchanges and custodians, and would require SEC approval before foreign-currency stablecoins can be listed or held by consumers. CBN issued guidelines on bank accounts for virtual asset service providers in 2024. Yellow Card reportedly closed its retail trading business in early 2026 to focus on business-to-business rails. A separate VASP bill is reported to be before the Senate. Rules are moving, so check current text.
- **This is not legal advice.** Get a Nigerian fintech lawyer before building anything that touches fiat.

## 3. Cross-cutting requirements

**3.1 Account abstraction (build in v1).** Define one Signer interface with three implementations: LocalKeySigner (v1), LedgerSigner (v1.1), PasskeySigner (v2). All screens and transaction flows talk only to the interface. Each signer declares capabilities: can sign classic transactions, can sign Soroban authorization entries, needs user presence per signature, and whether the device shows readable details.

**3.2 Privacy.** Any feature that sends data to a third party (scanning, prices, relayers, alerts) must disclose what is sent in plain language, be switchable where practical, and never include recovery phrases or keys.

**3.3 Feature flags and kill switches.** Every third-party dependency sits behind a flag so it can be turned off remotely without a store release.

**3.4 Security review.** Each feature gets its own review before mainnet exposure. Passkey and ramp features need an external review.

**3.5 Telemetry.** Opt-in only. No addresses, balances, or transaction contents.

## 4. Third-party malicious transaction scanning (v1.1, evaluate)

**Problem.** v1 simulates and explains transactions locally, but cannot know that a contract, asset, or site is malicious. A scanning service adds threat intelligence.

**Goals**

- Give users a clear verdict (safe, warning, or block) before they sign.
- Reduce successful scams without making honest transactions annoying.

**Out of scope:** scanning of recipients for compliance purposes, and any on-chain monitoring after signing.

**Evaluation plan**

1. Contact the candidate providers and ask: does the service cover Stellar and Soroban, is access open to a new wallet, pricing at your volume, rate limits, data retention, and uptime commitments.
2. Candidates: Blockaid, Merkle Science, and a build-it-yourself local rule engine (known-bad lists plus simulation heuristics).
3. Run each against a test set: ten known-malicious samples (if available), fifty normal transactions, and edge cases such as new assets and large swaps. Record detection, false positives, and response time.
4. Score on detection, false positives, latency, price, privacy, and fit with the extension.
5. Decision gate: pick a provider, pick the local-only option, or defer.

**Requirements (if a provider is chosen)**

1. Scan every signing request and swap before the confirmation screen is enabled.
2. Three outcomes: safe (normal screen), warning (banner with reasons, extra confirmation), block (no sign button by default; an advanced override with a clear explanation).
3. Latency budget of about one second. On timeout, show 'Could not check this transaction' and require an extra confirmation rather than silently approving.
4. Policy on provider failure is fail-warn, not fail-open: the user is told scanning was unavailable.
5. Local checks (simulation, spending-permission warnings, memo requirement) always run and are shown alongside the provider verdict.
6. Users can disable third-party scanning in Settings, with a plain explanation of what is sent.
7. A 'Report a wrong verdict' link on every warning and block.

**Design brief.** A verdict strip at the top of the signing screen (neutral, amber, red) with an icon and one sentence. Reasons listed in plain language below, technical details collapsed. The Approve button must never look more inviting than a warning. States: scanning in progress, safe, warning, blocked, unavailable, disabled by user.

**Technical notes.** Call the provider through your thin backend if the provider key must stay secret. Send only what is needed (transaction XDR, origin, network), never keys. Cache verdicts briefly for identical requests.

**Success metrics.** Share of signing requests scanned; warning and block rate; override rate after warnings; false-positive reports; scanning latency; zero cases where scanning failure silently approved a transaction.

**Risks and open questions.** Provider cost may exceed budget; provider may not support new wallets; false positives erode trust; sending transaction data to a third party is a privacy trade-off. Which providers will answer, and at what price?

**Release gate.** Evaluation report written, provider terms recorded, privacy text reviewed, kill switch tested.

## 5. Ledger support (v1.1)

**Problem.** Users with meaningful balances want keys on a hardware device.

**Goals**

- Let users add Ledger accounts and sign classic transactions with device confirmation.
- Be honest about what the device cannot show.

**Out of scope:** other hardware wallets, mobile hardware connection, and silently allowing blind-signed contract calls.

**Key constraint.** Classic operations display readably on the device, but Soroban contract calls generally do not, so signing them is effectively blind. The wallet's v1 swap path may involve contract calls through an aggregator. A Ledger user must therefore be told clearly which actions are safe to verify on the device.

**Requirements**

1. Connect to a Ledger over WebHID or WebUSB from a Chromium extension page. Note: this access generally cannot happen inside a background service worker, so connection and signing prompts run from an extension page (verify against current browser rules).
2. Add a Ledger account by selecting a derivation index, showing the address, and requiring the user to verify the same address on the device screen.
3. Support on-device signing for payments, trustline changes, and classic DEX offers and path payments.
4. For swaps, prefer the classic DEX path payment route for Ledger accounts, because it can be verified on-device. Offer the aggregator route only with a warning.
5. Contract calls: disabled by default for Ledger accounts. An advanced setting 'Allow blind signing of contract calls' can enable them, with a prominent warning that the device cannot show what is being approved, plus extra on-screen detail from the wallet's own simulation.
6. Clear states for device locked, app not open, connection lost, user rejected on device, and firmware or app too old.
7. Ledger accounts appear in the account list with a hardware badge. Keys never enter the extension.

**Design brief.** Setup wizard: connect, unlock, open the Stellar app, choose account, verify address. A hardware badge and capability note on each Ledger account ('Contract calls need extra care'). During signing, a modal says 'Confirm on your Ledger' with the key details repeated so users know what to compare. Error states have a single next step each.

**Technical notes.** Implement as LedgerSigner behind the Signer interface (section 3.1). Capability flags tell the swap and dApp flows what this account can safely do.

**Success metrics.** Share of users adding a Ledger; setup completion rate; signing success rate; share of Ledger users who enable blind signing (watch this: a high rate suggests the default is too restrictive or users are not understanding the risk).

**Risks and open questions.** Contract-call limitations may frustrate users; Ledger app updates may change behavior; testing needs real hardware. Which Ledger models and app versions will be supported at launch?

**Release gate.** Tested on at least two device models with current app versions, address verification confirmed, blind-signing warning reviewed by someone outside the build team.

## 6. Hausa interface (v1.1)

**Problem.** Many first-time users in Northern Nigeria are more comfortable in Hausa than English. For a wallet, misunderstanding a warning can mean lost money, so language is a safety feature as well as a growth feature.

**Goals**

- Offer the full interface in Hausa with the same clarity as English.
- Make security warnings and transaction summaries reliably understandable.

**Out of scope:** Ajami script, voice features, and additional languages (the system should make them easy later).

**Requirements**

1. All user-facing text lives in translation files (set up in v1). No sentences are assembled from fragments in code.
2. A language selector in onboarding and Settings. Default follows the browser language, user can change it.
3. Build a Stellar glossary first: trustline, reserve, memo, swap, slippage, recovery phrase, network fee. For each term, decide whether to translate, transliterate, or keep the English word with a short Hausa explanation. Apply it consistently.
4. Every string is translated and reviewed by at least one fluent Hausa speaker, and security warnings, signing summaries, and error messages get a second reviewer.
5. Number, currency, and date formats follow local conventions. Naira and dollar values are displayed clearly.
6. Fall back to English for any missing string, and flag it in a log, never show a raw key or blank.
7. Test layouts for longer text so buttons and warnings do not break.
8. Provide a way for users to report a bad translation.

**Design brief.** Language chooser as a friendly first-run choice with each language shown in its own name. Test all layouts with the longest strings. Warnings must keep their visual weight in both languages. Keep icons meaningful without text so comprehension does not depend only on words.

**Technical notes.** Use a standard message-format library with plural and variable support. Keep the translation files in the repository so contributors can propose fixes by pull request. Check whether the Chrome Web Store supports a Hausa store listing and fall back to English if not.

**Success metrics.** Share of users choosing Hausa; first-transaction completion rate in Hausa compared with English; comprehension test results (users can explain a trustline, a reserve, and a memo warning in their own words); count of translation bug reports.

**Risks and open questions.** Financial vocabulary in Hausa is not standardized, so inconsistent wording can confuse; reviewers must be recruited and credited; mistranslated warnings are a safety risk. Who will review, and how will they be compensated?

**Release gate.** 100% string coverage, glossary approved, warnings and signing screens double-reviewed, five-person comprehension test passed.

## 7. Dashboard: PnL, price alerts, order history (v1.2)

**Problem.** v1 shows balances and a simple portfolio view. Active users want to know whether they are up or down, be notified of price moves, and see what happened to their orders.

**Goals**

- Honest profit and loss numbers with a visible method.
- Useful alerts without needing an account.
- A complete, exportable record of swaps and orders.

**Out of scope:** tax advice, trading signals, margin features, and automated trading.

**Requirements**

*PnL*

1. Show realized and unrealized profit and loss per asset and in total, for 24 hours, 7 days, 30 days, and all time.
2. Default cost basis method: average cost. Offer first-in-first-out as an option. State the method on screen.
3. Incoming transfers from outside the wallet use the market price at receipt as cost basis and are labeled 'estimated'. Users can edit a cost basis manually.
4. Include network fees. Exclude the reserved XLM from performance calculations.
5. If a price is unavailable for an asset or date, show 'price unavailable' and exclude it from totals, with a note. Never invent a price.

*Price alerts* 6. Set an alert on an asset: above, below, or percent change over a period. 7. v1.2 alerts run locally. The extension checks prices on a schedule using browser alarms and shows a notification. State clearly that alerts only fire while the browser is running. 8. A server-based alert service (works when the browser is closed) is a later option and would need a privacy review, since it links alerts to a user identifier.

*Order history* 9. Show swaps and classic DEX offers: open, filled, partially filled, and cancelled, with price, amounts, fees, and timestamps. 10. Let users cancel open classic offers from the list (P1). 11. Export transactions and PnL data as CSV.

**Design brief.** A full-tab dashboard (the popup shows a summary and a link). Top: portfolio value and PnL cards with time-range switch. Middle: asset table with price, holdings, value, and PnL. Tabs for Alerts and Orders. Every PnL figure has an info icon explaining the method. States: loading, no history yet, price unavailable, partial data, offline.

**Technical notes.** The network's RPC keeps limited history, so store each user's history locally from first use and backfill from an indexer or explorer API. Price data comes from a market data provider through your backend, with caching. Abstract the provider so it can be replaced. Browser alarms in Manifest V3 have minimum intervals, so alert checks cannot be instant.

**Success metrics.** Dashboard weekly active users; alerts created per active user; share of users who open the PnL method explanation; export usage; PnL accuracy checked against a hand-calculated test set.

**Risks and open questions.** Price coverage for small Stellar assets may be thin; history backfill may be incomplete; wrong PnL numbers damage trust. Which price and history providers, and at what cost?

**Release gate.** PnL tested against a reference spreadsheet for at least ten scenarios (partial sells, transfers in, fees); data-gap states reviewed.

## 8. Passkey smart account with sponsored fees (v2)

**Problem.** Recovery phrases are the biggest barrier for newcomers, and needing XLM for fees blocks first transactions. A passkey account removes the phrase, and sponsorship removes the fee barrier.

**Goals**

- Create a wallet in under a minute using Face ID, fingerprint, or device PIN.
- Let users transact without holding XLM for fees, within sensible limits.
- Offer a recovery path that does not depend on a phrase.

**Out of scope:** writing custom account contracts, supporting every authenticator, and removing the standard account option.

**Requirements**

1. Create a smart (contract) account secured by a passkey, using audited, existing contract components (OpenZeppelin's smart account contracts and verifier) rather than custom contracts.
2. Sign using the passkey, behind the Signer interface (PasskeySigner).
3. Sponsor fees through a relayer. Choose between a managed relayer and one you run, based on cost and control.
4. Abuse controls: per-account daily limits on sponsored transactions, allow-listed operation types, rate limits, and a global budget cap. If the budget runs out, the app says so and offers 'pay the fee yourself'.
5. The relayer proxy fails closed: if it cannot verify a request, it refuses. Relayer secrets never ship in the extension.
6. Recovery: users can add a second passkey on another device, and optionally a recovery contact or backup signer. Explain what happens if the only passkey is lost.
7. Offer spending-limit policies on smart accounts (for example, daily maximum), using policy contracts that already exist.
8. Users with a standard account can create a smart account and move funds. Both types coexist and appear in one list.
9. Compatibility checks: before an action, tell the user if an app, anchor, or feature does not support smart accounts yet.

**Design brief.** Onboarding offers 'Quick start with a passkey' and 'Use a recovery phrase' as equals. Passkey creation screen explains in one sentence where the passkey lives and how it syncs. A recovery health card on Home: 'Add a second device' until done. Sponsored-fee indicator on the review screen ('Fee paid by the app'). States: passkey unavailable on this browser, creation cancelled, sponsorship limit reached, recovery in progress.

**Technical notes.** Passkeys are bound to a web domain (the relying party). How this works from an extension page, versus a hosted web page, must be tested early. A hosted onboarding page may be needed. Fee-bump transactions work for standard accounts, while relayers cover the authorization-entry signing used by contract accounts. Contract accounts are addressed differently from standard accounts, which affects compatibility with apps and anchors.

**Success metrics.** Share of new users choosing a passkey; time from install to first transaction; share who add a second device within seven days; sponsored fee cost per active user; sponsorship abuse rate; recovery success rate.

**Risks and open questions.** Passkey loss or sync failure could lock users out; sponsorship costs can grow with usage; ecosystem compatibility with contract accounts is still developing; the relayer is a new point of failure. Does passkey creation work reliably from the extension origin, and who pays for sponsorship at scale?

**Release gate.** External security review of the integration; recovery tested end to end on at least three browser and device combinations; budget and abuse controls load-tested; compatibility list published.

## 9. Naira on/off-ramp through anchors (v2)

**Problem.** Users need a way to turn naira into stablecoins and back. Today they must leave the wallet and use separate services.

**Goals**

- Let users buy and sell stablecoins with naira inside the wallet through licensed partners.
- Keep the wallet non-custodial and keep fiat handling entirely with the partner.

**Out of scope:** holding customer fiat, running your own anchor, handling KYC documents, and any card or bank integration built by you directly.

**Regulatory reality (read first).** Nigeria's rules for digital asset service providers are being rewritten, and wallet providers can fall inside the definition of a service provider. The draft August 2026 rules propose minimum capital, licensing through ARIP, and SEC approval for foreign-currency stablecoins held by consumers. A wallet that merely links to licensed partners may face different obligations than one that processes money, but that is a question for a lawyer, not an assumption. Do not launch until counsel has given a written opinion.

**Requirements**

1. Use the standard anchor flow: discover the partner through its published configuration file (SEP-1), authenticate (SEP-10), and run the deposit or withdrawal in the partner's hosted interactive flow (SEP-24). The partner handles KYC, bank details, and fiat.
2. Show an all-in quote before the user starts: rate, fees, expected arrival time, limits, and the partner's name and licensing status.
3. Track each transaction's status (pending, waiting for payment, completed, failed, refunded) with plain-language explanations and a support contact.
4. Support at least two partners if available, so users can compare and so one outage does not stop the feature.
5. Partner selection criteria: valid licensing, uptime record, fee transparency, settlement speed, support quality, and willingness to share compliance contacts.
6. Fraud protection: warn about common scams (fake agents, unsolicited payment requests), never display payment instructions the wallet cannot verify came from the partner, and show the partner's domain.
7. Geography and limits: gate by region where required, and start with low per-transaction and daily limits.
8. Only offer assets that are lawful and supported in the region, as advised by counsel.
9. Record any referral fee arrangement and disclose it to users in plain language.
10. First release supports standard accounts. Add smart-account support only after partners confirm compatibility.

**Design brief.** A 'Buy' and 'Sell' entry from Home. Step 1: choose partner with quote comparison. Step 2: confirm amount and see the all-in cost. Step 3: partner's hosted flow inside a framed window, with the partner's domain visible. Step 4: status tracker with a receipt. Error states: partner unavailable, verification pending, payment not received, limit exceeded, refund in progress. Include a short, honest explainer about what the wallet does and does not do in this flow.

**Technical notes.** Treat each partner as an adapter behind a common interface. Verify each partner's configuration file and domain before showing it. Poll or subscribe for status updates. Log only what is needed for support, with no bank details stored by the wallet.

**Success metrics.** Share of active users completing a ramp transaction; completion rate; median time to funds; support tickets per hundred transactions; partner uptime; reported fraud incidents (target zero).

**Risks and open questions.** Regulation may change before launch; partners may fail, lose banking access, or leave the market; fraud and support burden can be heavy; stablecoin restrictions could limit what you can offer. Which Stellar anchors currently support naira, and are they licensed?

**Go/no-go gates.** Written legal opinion; at least one licensed partner under agreement; end-to-end testing on testnet and with small real amounts; support process and fraud playbook in place; limits configured.

## 10. Dependencies and sequencing

- **Hausa** depends only on the translation setup from v1. It can ship any time.
- **Scanning** depends on provider access, which you can start exploring now.
- **Ledger** depends on the Signer interface and the capability flags.
- **Dashboard** depends on local history storage and a price provider.
- **Passkey accounts** depend on the Signer interface, a relayer, and passkey behavior in the extension.
- **Ramp** depends on legal clarity and partner compatibility, and should ship for standard accounts first.

Suggested order: Hausa and scanning evaluation in parallel, then Ledger, then the dashboard, then passkeys, then the ramp (or the ramp earlier if legal and partner work finishes first, since it does not depend on passkeys).

## 11. Indicative milestones (solo builder)

| Release | Scope | Indicative effort |
| --- | --- | --- |
| v1.1 | Scanning evaluation and integration, Ledger, Hausa | 6-10 weeks |
| v1.2 | Dashboard | 4-6 weeks |
| v2 | Passkey accounts and sponsored fees | 6-10 weeks plus external review |
| v2 | Naira ramp | 4-8 weeks of build, plus legal and partner lead time |

These are rough, assume part-time solo work, and exclude waiting on third parties.

## 12. Costs to price before committing

- Scanning provider fees at expected request volume.
- Price and history data provider fees.
- Relayer fees and the sponsorship budget per active user.
- External security review for passkeys and the ramp.
- Legal opinion and any registration costs.
- Translation reviewers' time.

## 13. Combined risks and open questions

**Top risks:** regulatory change; security flaws in passkey or signing code; third-party dependence (scanning, prices, relayer, anchors); support and fraud burden; competitors shipping similar features.

**Open questions**

1. Which scanning provider will give a new wallet access, and at what price?
2. Which Ledger models and app versions will be supported at launch?
3. Who will review Hausa translations?
4. Which price and history providers will power the dashboard?
5. Does passkey creation work reliably from an extension origin?
6. Who pays for sponsored fees as usage grows?
7. Which licensed anchors support naira, and do they support smart accounts?
8. What does counsel say about a wallet's obligations when it links to licensed partners?

## 14. Appendix: assumptions to verify and sources reviewed

**Verify before building:** provider coverage and access terms; Ledger app behavior for contract calls; browser rules for hardware access and WebAuthn from extensions; current Nigerian rule text (draft versus final); anchor licensing and smart-account compatibility; Chrome Web Store language support.

**Sources reviewed (October 2026):** Stellar developer documentation on fee sponsorship; the open-source passkey-kit, smart-account-kit, and related SCF project descriptions; a Stellar community discussion on clear signing for Soroban; Stellar CLI Ledger issue tracker; Stellar Dev Dashboard repository; Lantern wallet repository comparison table (self-reported); SCF submissions for transaction visualization and Merkle Science integration; Nominis, BusinessDay, Mariblock, and regalert.today summaries of Nigerian digital asset regulation. Several are secondary or self-reported, so confirm against primary sources.
