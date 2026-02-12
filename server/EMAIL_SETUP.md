# Email Notification Setup Instructions

## Gmail App Password Setup

To enable email notifications, you need to generate a Gmail App Password:

### Steps:

1. **Enable 2-Factor Authentication on your Gmail account** (if not already enabled)
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device and name it (e.g., "Image Scanner App")
   - Click "Generate"
   - Copy the 16-character password

3. **Create .env file in the server directory**
   ```bash
   cd server
   cp .env.example .env
   ```

4. **Update the .env file with your credentials**
   ```
   EMAIL_USER=info@kggeniuslabs.com
   EMAIL_PASSWORD=your_16_character_app_password
   ```

   Replace `your_16_character_app_password` with the App Password you generated in step 2.

## Features Implemented

### 1. Task Creation Email Notification
- **Trigger**: Automatically sent when an admin creates a new task
- **From**: info@kggeniuslabs.com
- **To**: sankar.k@kggeniuslabs.com
- **CC**: info@kggeniuslabs.com
- **Content**: Task details (ID, title, description, category, total images)

### 2. Daily Report Email at 7 PM
- **Schedule**: Every day at 7:00 PM IST
- **From**: info@kggeniuslabs.com
- **To**: sankar.k@kggeniuslabs.com
- **CC**: info@kggeniuslabs.com
- **Content**: 
  - Total images uploaded
  - Total images approved
  - Total images rejected
  - Pending images count
  - Approval/rejection/pending rates
  - Task-wise breakdown

## Testing

### Test Task Creation Email
Create a new task from the admin dashboard and check if the email is received.

### Test Daily Report Manually
You can modify the cron schedule temporarily to test:
```javascript
// In server.js, change:
cron.schedule('0 19 * * *', ...)

// To run every minute for testing:
cron.schedule('* * * * *', ...)
```

Remember to change it back to `'0 19 * * *'` after testing.

## Troubleshooting

### Email not sending?
1. Verify your Gmail App Password is correct in `.env`
2. Check server console for error messages
3. Ensure 2-Factor Authentication is enabled on Gmail
4. Make sure "Less secure app access" is NOT turned on (use App Password instead)

### Cron job not running?
1. Check server console for "Daily report cron job scheduled" message
2. Verify timezone is correct (currently set to Asia/Kolkata)
3. Server must be running at 7:00 PM for the job to execute

## Security Note
- Never commit the `.env` file to version control
- The `.env` file is already listed in `.gitignore`
- Keep your App Password secure and private
