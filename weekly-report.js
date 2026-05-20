const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const XLSX = require('xlsx');

const BUCKET = 'airdna-prod-reports';
const PREFIX = 'weekly-gtr/';

const s3 = new S3Client({ region: 'us-east-1' }); // adjust region if needed

async function getLatestWeeklyFolder() {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: PREFIX,
    Delimiter: '/'
  });

  const response = await s3.send(command);
  const folders = response.CommonPrefixes || [];

  if (folders.length === 0) {
    throw new Error('No folders found in weekly-gtr/');
  }

  // Extract folder names and sort by date (assuming format like 2026-05-19 or similar)
  const sortedFolders = folders
    .map(f => f.Prefix)
    .sort()
    .reverse();

  const latestFolder = sortedFolders[0];
  console.log(`Latest folder: ${latestFolder}`);
  return latestFolder;
}

async function listFilesInFolder(folderPath) {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: folderPath
  });

  const response = await s3.send(command);
  return response.Contents || [];
}

async function downloadFile(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key
  });

  const response = await s3.send(command);
  const buffer = await streamToBuffer(response.Body);
  return buffer;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  return { sheetName, data, sheetNames: workbook.SheetNames };
}

async function generateSlackReport(data) {
  const date = new Date().toISOString().split('T')[0];

  let slack = `*Weekly GTR Report*\n`;
  slack += `_Generated: ${date} | Folder: ${data.folder.split('/').slice(-2, -1)[0]}_\n\n`;

  for (const file of data.parsedFiles) {
    slack += `*${file.fileName}*\n`;
    slack += `  Sheets: ${file.sheetNames.join(', ')}\n`;
    slack += `  Rows: ${file.rowCount}\n`;

    // Show column names
    if (file.columns.length > 0) {
      slack += `  Columns: ${file.columns.slice(0, 5).join(', ')}`;
      if (file.columns.length > 5) {
        slack += ` (+${file.columns.length - 5} more)`;
      }
      slack += `\n`;
    }

    // TODO: Add your custom metrics here
    // Example: Sum a column, count unique values, etc.
    // slack += `  Total Revenue: ${sumColumn(file.data, 'revenue')}\n`;

    slack += `\n`;
  }

  return slack;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  try {
    console.log('Fetching latest weekly-gtr folder...\n');

    const latestFolder = await getLatestWeeklyFolder();
    const files = await listFilesInFolder(latestFolder);

    // Filter for xlsx files only
    const xlsxFiles = files.filter(f => f.Key.endsWith('.xlsx'));
    console.log(`Found ${xlsxFiles.length} xlsx files in ${latestFolder}\n`);

    const parsedFiles = [];
    for (const file of xlsxFiles) {
      console.log(`Downloading: ${file.Key.split('/').pop()}`);
      const buffer = await downloadFile(file.Key);
      const parsed = parseXlsx(buffer);

      parsedFiles.push({
        fileName: file.Key.split('/').pop(),
        sheetNames: parsed.sheetNames,
        data: parsed.data,
        rowCount: parsed.data.length,
        columns: parsed.data.length > 0 ? Object.keys(parsed.data[0]) : []
      });
    }

    console.log('\n');

    const slackMessage = await generateSlackReport({
      folder: latestFolder,
      files: xlsxFiles,
      parsedFiles
    });

    console.log('=== SLACK MESSAGE ===\n');
    console.log(slackMessage);
    console.log('\n=== END ===');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
