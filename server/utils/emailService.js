const nodemailer = require('nodemailer');

// Create transporter for Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'info@kggeniuslabs.com',
      pass: process.env.EMAIL_PASSWORD || 'cgzz hngh entc qnwd' // Gmail App Password
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
            This is an automated notification from the Genius Labs Image Accumulator System.
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
      subject: `Daily Report - Genius Labs Image Accumulator Statistics (${new Date().toLocaleDateString()})`,
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
                  <th style="padding: 10px; text-align: right;">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                ${stats.taskBreakdown.map((task, index) => {
                  const ratePerImage = 4;
                  const taskAmount = task.approved * ratePerImage;
                  return `
                  <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${task.taskTitle}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${task.uploaded}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; color: #27ae60;">${task.approved}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; color: #e74c3c;">${task.rejected}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd; font-weight: bold; color: #16a34a;">Rs.${taskAmount.toLocaleString('en-IN')}</td>
                  </tr>
                `}).join('')}
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

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #16a34a; margin-top: 0;">Financial Summary</h3>
            <p style="margin: 5px 0; font-size: 16px;">Rate per Approved Image: <strong>Rs.4</strong></p>
            <p style="margin: 5px 0; font-size: 16px;">Total Approved Images: <strong>${stats.totalApproved}</strong></p>
            <p style="margin: 10px 0 5px 0; font-size: 20px; color: #16a34a;">Total Amount: <strong>Rs.${(stats.totalApproved * 4).toLocaleString('en-IN')}</strong></p>
          </div>

          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            This is an automated daily report sent at 7:00 PM from the Genius Labs Image Accumulator System.
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

/**
 * Send billing email with task-wise breakdown
 * @param {Object} billingData - Billing data including tasks and totals
 */
const sendBillingEmail = async (billingData) => {
  try {
    const transporter = createTransporter();
    
    const { tasks, totalApproved, totalRejected, totalUploaded, totalPending, totalAmount, rates } = billingData;
    
    const mailOptions = {
      from: 'info@kggeniuslabs.com',
      to:'sankar.k@kggeniuslabs.com',
      // to: 'krishnapriya.p@kggeniuslabs.com',
      // cc: 'chitradevi.m@kggeniuslabs.com',
      subject: `Billing Report - Genius Labs Image Accumulator (${new Date().toLocaleDateString()})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
          <h2 style="color: #2c3e50;">Genius Labs Image Accumulator - Billing Report</h2>
          <p style="color: #7f8c8d;">Generated on: ${new Date().toLocaleString()}</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">Overall Summary</h3>
            <p style="margin: 10px 0;"><strong>Total Tasks Selected:</strong> ${tasks.length}</p>
            <p style="margin: 10px 0;"><strong>Total Images Uploaded:</strong> ${totalUploaded}</p>
            <p style="margin: 10px 0;"><strong>Approved Images:</strong> ${totalApproved}</p>
            <p style="margin: 10px 0;"><strong>Rejected Images:</strong> ${totalRejected}</p>
            <p style="margin: 10px 0;"><strong>Pending Images:</strong> ${totalPending}</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">Task-wise Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #34495e; color: white;">
                  <th style="padding: 10px; text-align: left;">Task Name</th>
                  <th style="padding: 10px; text-align: center;">Start Date</th>
                  <th style="padding: 10px; text-align: center;">End Date</th>
                  <th style="padding: 10px; text-align: center;">Uploaded</th>
                  <th style="padding: 10px; text-align: center;">Approved</th>
                  <th style="padding: 10px; text-align: center;">Rejected</th>
                  <th style="padding: 10px; text-align: center;">Pending</th>
                  <th style="padding: 10px; text-align: center;">Per Image Cost</th>
                  <th style="padding: 10px; text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.map((task, index) => `
                  <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${task.taskTitle}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${task.startDate ? new Date(task.startDate).toLocaleDateString('en-IN') : ''}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${task.endDate ? new Date(task.endDate).toLocaleDateString('en-IN') : ''}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${task.uploaded}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; color: #27ae60;">${task.approved}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; color: #e74c3c;">${task.rejected}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; color: #f39c12;">${task.pending}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Rs.${task.approved > 0 ? (task.amount / task.approved).toFixed(2) : '0.00'}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd; font-weight: bold; color: #16a34a;">Rs.${task.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background-color: #34495e; color: white; font-weight: bold;">
                  <td colspan="8" style="text-align: right; padding: 10px;">Total Amount:</td>
                  <td style="text-align: right; padding: 10px;">Rs.${totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #16a34a; margin-top: 0;">Total Amount</h3>
            <p style="margin: 10px 0; font-size: 24px; color: #16a34a; font-weight: bold;">Rs.${totalAmount.toLocaleString('en-IN')}</p>
            <p style="margin: 5px 0; font-size: 12px; color: #7f8c8d;">Rates: Standard Rs.4, Agri Diseased Rs.${rates[75]}, Pest Rs.${rates[76]}</p>
          </div>

          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            This is an automated billing report from the Genius Labs Image Accumulator System.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Billing email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending billing email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendTaskCreationEmail,
  sendDailyReportEmail,
  sendBillingEmail
};
