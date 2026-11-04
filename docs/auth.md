# Auth

The tools act as a logged in ComicK user by sending the browser session cookie. No username or password is stored anywhere.

## Cookie

| Cookie name | Goes into |
| --- | --- |
| `__Secure-comick-auth.session_token` | `COMICK_SESSION_TOKEN` in `.env` |

## Getting the value

1. Log in to ComicK in your browser with the staff account.
2. Open DevTools (F12).
3. Chrome / Edge: **Application** tab, then **Cookies**, then the ComicK domain.
   Firefox: **Storage** tab, then **Cookies**.
4. Find `__Secure-comick-auth.session_token` and copy the **Value** column.
5. Paste it into `.env`:

   ```
   COMICK_SESSION_TOKEN=paste-it-here
   ```

No quotes needed.

## Sending it

Tools attach it as a cookie, not a bearer header:

```python
import os
import requests

session = requests.Session()
session.cookies.set(
    "__Secure-comick-auth.session_token",
    os.environ["COMICK_SESSION_TOKEN"],
)
```

## When it stops working

Sessions expire, and logging out in the browser kills the token right away. A 401 or a redirect to the login page means it's time to grab a fresh value.

## Handling it safely

- Treat the token like a password. Anyone holding it is logged in as you.
- Don't paste it in chat, issues, or logs.
- If it leaks, log out of ComicK in the browser to revoke it.
