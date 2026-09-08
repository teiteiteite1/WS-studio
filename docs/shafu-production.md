# SHAFU production update

The existing `/control` entry point now opens PROMPT, with four primary tabs: PROMPT, ネタ帳, ARCHIVE, MEMO. Settings retain Bible, Story and access to legacy production records.

Generation uses one `production_prompt` request. Structured output requires title, summary, both 20-second prompts and a concrete shared continuity state. Missing/blank or identical parts return HTTP 502. Both delivered prompts receive character/reference, voice, direction, negative and continuity rules server-side. No automatic creative retry is added.

Persistence reuses `shafu_workspace_v1` and the existing workspace sync. Additive optional fields: ideas.stockStatus; projects.production, publicationStatus, episodeNumber, metrics; notes.date. Existing project statuses, original prompts, episodes, media IDs and story data are retained. No database migration is required. Legacy two-episode prompts can be displayed in the archive; older single prompts remain accessible as original text, without inventing a second part. Manual archives can intentionally contain empty prompts.

Verification: TypeScript and targeted ESLint pass; production build passes; 11 SHAFU tests pass, including missing/blank/duplicate PART 2, standalone common rules/continuity, and additive-data preservation. Browser testing could not run because the cloud browser blocked the local development URL. No real OpenAI request or authenticated cloud sync write was performed. Creative quality, 20-second spoken timing and rendered mobile interaction require live verification. No deployment performed.
