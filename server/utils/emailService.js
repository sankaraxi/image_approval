const nodemailer = require('nodemailer');

// Create transporter for Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'info@kggeniuslabs.com',
      pass: process.env.EMAIL_PASSWORD // Gmail App Password
    }
  });
};

/**
 * Send email notification when a new task is created
 * @param {Object} taskDetails - Details of the created task
 */
const sendTaskCreationEmail = async (taskDetails) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: 'info@kggeniuslabs.com',
      to: 'krishnapriya.p@kggeniuslabs.com',
      // to: 'sankar.k@kggeniuslabs.com',
      cc: 'info@kggeniuslabs.com',
      subject: `New Task Created: ${taskDetails.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #2c3e50;">New Task Created</h2>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Task ID:</strong> ${taskDetails.taskId}</p>
            <p style="margin: 10px 0;"><strong>Title:</strong> ${taskDetails.title}</p>
            <p style="margin: 10px 0;"><strong>Description:</strong> ${taskDetails.description || 'N/A'}</p>
            <p style="margin: 10px 0;"><strong>Category:</strong> ${taskDetails.categoryName || 'N/A'}</p>
            <p style="margin: 10px 0;"><strong>Total Images Required:</strong> ${taskDetails.totalImages}</p>
            <p style="margin: 10px 0;"><strong>Created By:</strong> ${taskDetails.createdBy}</p>
            <p style="margin: 10px 0;"><strong>Created At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            This is an automated notification from the Image Scanner System.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Task creation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending task creation email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send daily report email with image statistics
 * @param {Object} stats - Statistics for the day
 */
const sendDailyReportEmail = async (stats) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: 'info@kggeniuslabs.com',
      to: 'krishnapriya.p@kggeniuslabs.com',
      // to: 'sankar.k@kggeniuslabs.com',
      cc: 'info@kggeniuslabs.com',
      subject: `Daily Report - Image Scanner Statistics (${new Date().toLocaleDateString()})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #2c3e50;">Daily Image Statistics Report</h2>
          <p style="color: #7f8c8d;">Report Date: ${new Date().toLocaleDateString()}</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">Overall Statistics</h3>
            <p style="margin: 10px 0; font-size: 18px;"><strong>Total Images Uploaded:</strong> <span style="color: #3498db;">${stats.totalUploaded}</span></p>
            <p style="margin: 10px 0; font-size: 18px;"><strong>Approved Images:</strong> <span style="color: #27ae60;">${stats.totalApproved}</span></p>
            <p style="margin: 10px 0; font-size: 18px;"><strong>Rejected Images:</strong> <span style="color: #e74c3c;">${stats.totalRejected}</span></p>
            <p style="margin: 10px 0; font-size: 18px;"><strong>Pending Review:</strong> <span style="color: #f39c12;">${stats.totalPending}</span></p>
          </div>

          ${stats.taskBreakdown && stats.taskBreakdown.length > 0 ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">Task-wise Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #34495e; color: white;">
                  <th style="padding: 10px; text-align: left;">Task</th>
                  <th style="padding: 10px; text-align: center;">Uploaded</th>
                  <th style="padding: 10px; text-align: center;">Approved</th>
                  <th style="padding: 10px; text-align: center;">Rejected</th>
                </tr>
              </thead>
              <tbody>
                ${stats.taskBreakdown.map((task, index) => `
                  <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${task.taskTitle}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${task.uploaded}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; color: #27ae60;">${task.approved}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; color: #e74c3c;">${task.rejected}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #856404; margin-top: 0;">Summary</h3>
            <p style="margin: 5px 0;">Approval Rate: <strong>${stats.approvalRate}%</strong></p>
            <p style="margin: 5px 0;">Rejection Rate: <strong>${stats.rejectionRate}%</strong></p>
            <p style="margin: 5px 0;">Pending Rate: <strong>${stats.pendingRate}%</strong></p>
          </div>

          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            This is an automated daily report sent at 7:00 PM from the Image Scanner System.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Daily report email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending daily report email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendTaskCreationEmail,
  sendDailyReportEmail
};
