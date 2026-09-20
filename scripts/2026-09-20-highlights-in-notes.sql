-- Let highlights be findable again.
--
-- bible_highlights is read in exactly one place today, scoped to the chapter
-- you happen to be reading:
--     .eq('chapter_id', `${bookId}.${chNum}`)
-- so a highlight is write-and-forget. The only way to see one again is to
-- navigate back to that exact chapter and remember it is there. There is no
-- "my highlights" view anywhere in the app.
--
-- Notes already groups scripture-anchored things by book (bible_notes and verse
-- bookmarks), so highlights belong in those same sections. To render one we need
-- its text and its book, and the row carries neither — only chapter_id,
-- verse_num and colour.
--
-- Storing the text rather than re-fetching it: the Bible API has a monthly
-- limit, Notes is a screen people open often, and a snapshot is arguably more
-- correct — someone who highlighted in NIV should not see KJV later because
-- they changed translation.
alter table public.bible_highlights
  add column if not exists verse_text text,
  add column if not exists book_name  text;

notify pgrst, 'reload schema';

-- Existing highlights keep working; they simply show the reference without the
-- text until they are re-highlighted. Backfilling would cost Bible API calls
-- for 9 rows, which is not worth it.
select count(*) as total,
       count(verse_text) as with_text
from public.bible_highlights;
