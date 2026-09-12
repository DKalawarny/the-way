// The columns the browser is allowed to read from `profiles`.
//
// Four columns are deliberately absent, and the database revokes them from the
// anon and authenticated roles as well, so this list is a convenience rather
// than the security boundary:
//
//   ai_memory            the AI's standing summary of a person, written from
//                        their conversations. Daniel's contained his five
//                        children's ages, ~$600k in capital gains, and an
//                        unannounced business exit — none of which he ever
//                        typed as profile information. Any signed-in account
//                        could read any user's copy with one REST call.
//   research_memory      same shape, same problem.
//   stripe_customer_id   billing identifiers, no business in a browser.
//   stripe_subscription_id
//
// The server reads all four with the service key, which is unaffected. When the
// "see what kinwove remembers about you" screen gets built, it should be served
// by an endpoint rather than by widening this list — a person should be able to
// read their own summary, and still nobody else's.
export const PROFILE_COLUMNS = [
  'id', 'display_name', 'age_range', 'gender', 'city', 'country', 'person_type',
  'background', 'tradition', 'home_found_at', 'exploring_since', 'what_brought',
  'looking_for', 'is_verified', 'created_at', 'updated_at', 'avatar_config',
  'allow_follows', 'allow_friend_requests', 'tts_voice', 'church_id', 'is_pastor',
  'is_premium', 'is_admin', 'avatar_url', 'banner_url', 'flags', 'preferred_language',
  'show_flag', 'banner_preset', 'banner_position', 'plan', 'gift_expires_at',
  'promo_redeemed_at', 'mentor_open', 'connect_open', 'last_stage',
  'is_system_account', 'birthday', 'is_youth_sponsored', 'sync_conversations',
  'daily_verse_opt_out', 'verse_streak', 'verse_streak_at', 'notif_prefs',
  'ai_grace_granted_at',
].join(', ');
