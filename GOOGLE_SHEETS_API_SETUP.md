# Google Sheets API Key Setup Guide

## Why You Need This

When syncing Google Sheets with more than 250 rows, the CSV export method has limitations. Setting up the Google Sheets API allows:

- ✅ Unlimited row syncing (tested with 1000+ rows)
- ✅ Faster data loading
- ✅ Better error handling
- ✅ Direct API access (no CORS limitations)

## Step 1: Create a Google Cloud Project

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Sign in with your Google account
3. Click the **Project dropdown** at the top
4. Click **"New Project"**
5. Enter a project name (e.g., "CRM-Lead-Sync")
6. Click **"Create"**
7. Wait for the project to be created (this may take a minute)

## Step 2: Enable Google Sheets API

1. In the Cloud Console, search for **"Google Sheets API"**
2. Click on "Google Sheets API" in the results
3. Click **"Enable"** button
4. Wait for it to be enabled

## Step 3: Create an API Key

1. Go to **"Credentials"** in the left sidebar (or search for "Credentials")
2. Click **"Create Credentials"** button at the top
3. Select **"API Key"** from the dropdown
4. An API key will be generated and displayed
5. **Copy the API key** - you'll need it in the next step
   - It looks something like: `AIzaSyD_xxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 4: Restrict Your API Key (Recommended for Security)

1. **Click on the API key** you just created to edit it
2. Under **"API restrictions"**:
   - Select **"Google Sheets API"** only
   - This restricts the key to only access Google Sheets
3. Under **"Application restrictions"**:
   - Select **"HTTP referrers (web sites)"**
   - Add your domain: `https://your-domain.com/*`
   - (If testing locally, add: `http://localhost:*`)
4. Click **"Save"**

## Step 5: Add API Key to Your Application

### For Local Development:

1. Create or edit `.env` file in your project root:

   ```
   GOOGLE_SHEETS_API_KEY=AIzaSyD_xxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. Restart your dev server:
   ```bash
   npm run dev
   ```

### For Production (Netlify):

1. Go to your Netlify project settings
2. Navigate to **"Build & Deploy"** → **"Environment"**
3. Click **"Edit variables"**
4. Add new variable:
   - **Key**: `GOOGLE_SHEETS_API_KEY`
   - **Value**: Your API key (paste from Step 3)
5. **Redeploy** your site:
   - Go to **"Deploys"**
   - Click **"Trigger deploy"** → **"Deploy site"**

### For Other Hosting Platforms:

- **Vercel**: Project Settings → Environment Variables
- **Render**: Environment → Add Environment Variable
- **Railway**: Variables section
- **Any other**: Add `GOOGLE_SHEETS_API_KEY` environment variable following their docs

## Step 6: Verify It's Working

1. Open your CRM application
2. Go to the Leads page
3. Click **"Sync"** on any sheet
4. Look for the message: `"Syncing leads using Google Sheets API..."`
5. If successful, you'll see: `✓ Synced X leads from [Sheet Name]`

## Troubleshooting

### "API key not configured" Error

- Verify the API key is set in `.env` (local) or environment variables (hosting)
- Restart your dev server after changing `.env`
- Check that the key is copied correctly (no extra spaces)

### "Invalid API key" Error

- Verify you're using the correct API key
- Check that Google Sheets API is enabled in Cloud Console
- Make sure the API key has no application restrictions (or is properly configured)

### Still Getting CSV Export Fallback

- Ensure `GOOGLE_SHEETS_API_KEY` environment variable is set
- The system will automatically fall back to CSV if API key is not found
- Check browser console for logs like: `[FETCH API] Fetching Google Sheet via API`

### Rate Limiting

Google Sheets API has free tier quotas:

- **300 requests per minute** per project
- **10 million cells read per month**

If you exceed limits, contact Google Cloud to upgrade your quota.

## Security Best Practices

1. **Use Application Restrictions**: Only allow your domain
2. **Use HTTP Referrer Restrictions**: Don't allow all referrers
3. **Rotate API Keys**: Create new keys periodically
4. **Monitor Usage**: Check Google Cloud Console for API usage
5. **Use Service Account** (Advanced): For better security in production, use a service account instead of API key

## Next Steps

Once API key is configured:

1. **Large sheets sync faster**: 500+ rows load in seconds instead of minutes
2. **Better reliability**: Less likely to hit CSV export limits
3. **Enhanced features**: Can detect sheet names dynamically
4. **Improved error handling**: Detailed messages for debugging

## Need Help?

- Check `.env` file exists and contains the API key
- Look in browser console (F12) for detailed logs
- Verify Google Cloud project is active (check quotas)
- Ensure API key hasn't exceeded rate limits
