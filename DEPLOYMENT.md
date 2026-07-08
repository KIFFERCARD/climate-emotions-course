# Deploying course.mhcca.ca

The site is fully static (plain HTML, CSS, and audio files), so Vercel needs no build step. Deployment has three parts: put the repo on Vercel, attach the subdomain in Vercel, and add one DNS record in Squarespace (where mhcca.ca's DNS is managed).

## 1. Commit and push the reorganized site

From this folder:

```
git add -A
git commit -m "Add landing page, move course to course.html"
git push
```

## 2. Import the repo into Vercel

1. Go to https://vercel.com/new and sign in.
2. Import the `climate-emotions-course` GitHub repository.
3. When asked about settings, set Framework Preset to **Other**. Leave Build Command and Output Directory empty. Root Directory stays as the repo root.
4. Click **Deploy**. You'll get a working preview at something like `climate-emotions-course.vercel.app`. Check that the landing page, course, curriculum sections, glossary, and audio all work there before touching DNS.

Every future `git push` to the default branch will redeploy automatically.

## 3. Add the subdomain in Vercel

1. In the Vercel project, open **Settings → Domains**.
2. Enter `course.mhcca.ca` and click **Add**.
3. Vercel will show the DNS record it wants. For a subdomain this is a CNAME, typically:

   | Type  | Name (host) | Value                    |
   |-------|-------------|--------------------------|
   | CNAME | course      | `cname.vercel-dns-0.com` |

   Use the exact value Vercel displays for your project; it can differ from the general one above.

## 4. Add the CNAME record in Squarespace

1. Sign in at https://account.squarespace.com/domains and click **mhcca.ca**.
2. Open **DNS** (labelled "DNS Settings" or "Edit DNS" depending on the dashboard version), then find **Custom Records**.
3. Add a record:
   - Type: `CNAME`
   - Host: `course`
   - Data / Value: the value from step 3 (e.g. `cname.vercel-dns-0.com`)
4. Save. Leave every existing record alone; you are only adding one.

## 5. Wait for verification

Back in Vercel's Domains settings, the `course.mhcca.ca` entry will flip from "Invalid Configuration" to verified once DNS propagates. This usually takes minutes, occasionally up to a few hours. Vercel issues the HTTPS certificate automatically; nothing to configure in Squarespace.

## Notes

- This matches how the sibling sites (facilitation.mhcca.ca, evaluation.mhcca.ca) are structured: each is its own Vercel project attached to one subdomain, with DNS living at the domain registrar.
- Everything in the repo becomes publicly downloadable once deployed, including `Curriculum.docx` and the `Feedback forms` folder. To exclude working files from the deployment, create a `.vercelignore` file listing them, for example:

  ```
  Curriculum.docx
  Audio settings for eleven labs.docx
  Feedback forms/
  slide-scripts.md
  ```
- The landing page is `index.html`, the two-hour course is `course.html`. If anyone has bookmarked the old course URL at the site root, they will now land on the landing page, one click from the course.
