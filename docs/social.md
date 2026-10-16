# TXT social accounts

The **Social** tab in the study tools dock collects TXT's group accounts and
all five members' Instagram profiles. Each card opens the account in a new
browser tab; the Windows app opens it in the default browser. The timer footer
stays available in the Social tab.

## Accounts

Account references checked on October 14, 2026.

| Account | Platform | Handle |
| --- | --- | --- |
| TXT group | Instagram | [@txt_bighit](https://www.instagram.com/txt_bighit/) |
| TXT official | X / Twitter | [@TXT_bighit](https://x.com/TXT_bighit) |
| TXT members (shared) | X / Twitter | [@TXT_members](https://x.com/TXT_members) |
| Soobin | Instagram | [@page.soobin](https://www.instagram.com/page.soobin/) |
| Yeonjun | Instagram | [@yawnzzn](https://www.instagram.com/yawnzzn/) |
| Beomgyu | Instagram | [@bamgyuuuu](https://www.instagram.com/bamgyuuuu/) |
| Taehyun | Instagram | [@you.th](https://www.instagram.com/you.th/) |
| Hueningkai | Instagram | [@kaikamal_](https://www.instagram.com/kaikamal_/) |

The three group links match the footer loaded by [TXT's official BIGHIT
site](https://txt.ibighit.com/eng/), specifically its
[footer fragment](https://txt.ibighit.com/eng/global/footer.html).
Member handles were cross-checked against the linked accounts in their
Instagram launch announcements:
[Soobin](https://www.soompi.com/article/1594936wpp/txts-soobin-launches-personal-instagram-account),
[Yeonjun](https://www.soompi.com/article/1507282wpp/txts-yeonjun-opens-personal-instagram-account),
[Beomgyu](https://www.soompi.com/article/1634980wpp/txts-beomgyu-launches-personal-instagram-account),
[Taehyun](https://www.soompi.com/article/1787894wpp/txts-taehyun-launches-personal-instagram-account),
and [Hueningkai](https://www.soompi.com/article/1807178wpp/txts-hueningkai-launches-personal-instagram-account).
Direct Instagram profile requests were blocked or throttled during research;
their live pages were not checked interactively.

## Display and maintenance

This version uses account links. It does not fetch posts, follower counts,
stories, or profile photos, and does not need social API credentials. The user
signs in directly on Instagram or X if those sites require it.

[X's official timeline widget](https://help.x.com/en/using-x/embed-x-feed)
provides a supported path for a future embedded X view. Instagram documents
[post and profile embedding](https://help.instagram.com/620154495870484/),
but that help page and Meta's developer documentation could not be retrieved
in this session. Embedded behavior has not been validated here; account links
give the current tab a dependable way to open each profile.

`src/data/social.ts` contains the curated account URLs. When a handle changes,
verify it using official sources and update that file and this document.
`SocialCard` follows the existing theme tokens and uses initials rather than
third-party profile images. It has no timers, persistence writes, or embed
scripts, and it stays mounted with the other tools.

The production build and lint checks passed, and all 146 automated tests
passed. The Windows executable was rebuilt; all 61 bundled frontend assets
match the production build, and its headless self-test passed. Interactive
appearance and link clicks remain unverified because the computer-use
connection is unavailable in this session.

Suggested commit message: `feat: add TXT social accounts tab`
