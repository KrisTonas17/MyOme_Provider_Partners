# Partner with MyOme

A landing page with a partner inquiry form. Submissions are emailed to kris.tonas@myome.com through Resend.

## Files

- `index.html` is the landing page and form
- `myome-logo.png`, `myome-logo-white.png` are the logos
- `api/submit.js` is the serverless function that validates the form and sends the email

## One-time setup (about 10 minutes)

### 1. Get a Resend API key
1. Sign up free at https://resend.com **using kris.tonas@myome.com**.
2. Go to **API Keys**, click **Create API Key**, and copy it (it starts with `re_`).

Signing up with kris.tonas@myome.com matters. Until a domain is verified, Resend's test sender (`onboarding@resend.dev`) can only deliver to the email address on your Resend account.

### 2. Put the code on GitHub
1. Create a new repository on GitHub (for example `myome-partners`).
2. Upload everything from this zip directly into the repo, so `index.html` and the `api` folder sit at the top level.

### 3. Deploy on Vercel
1. At https://vercel.com, click **Add New > Project** and import the GitHub repository.
2. Leave Framework Preset as **Other**, with no build command.
3. Open **Environment Variables** and add:
   - `RESEND_API_KEY` = your key from step 1
4. Click **Deploy**.

### 4. Test it
Open the live URL, submit the form with your own details, and check your inbox (and spam folder the first time).

## Optional settings (Vercel > Settings > Environment Variables)

| Variable | Default | Use |
|---|---|---|
| `TO_EMAIL` | kris.tonas@myome.com | Send submissions somewhere else |
| `FROM_EMAIL` | MyOme Partnerships <onboarding@resend.dev> | Send from a myome.com address after verifying the domain in Resend |

Redeploy after changing environment variables.

To send from a myome.com address, add and verify the domain in Resend (Domains > Add Domain). This needs a few DNS records from whoever manages myome.com. Then set `FROM_EMAIL`, for example `MyOme Partnerships <partners@myome.com>`.

## Notes
- Replying to a submission email replies straight to the person who filled out the form.
- A hidden spam trap field quietly drops most bot submissions.
- Every field is checked in the browser and again on the server.
