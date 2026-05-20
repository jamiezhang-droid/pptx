const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

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
  const bodyContents = await streamToString(response.Body);
  return bodyContents;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function generateSlackReport(data) {
  // TODO: Customize this based on your report format
  const date = new Date().toISOString().split('T')[0];

  let slack = `*Weekly GTR Report*\n`;
  slack += `_Generated: ${date}_\n\n`;

  // Add your metrics here based on the file contents
  slack += `• *Files processed:* ${data.files.length}\n`;

  for (const file of data.files.slice(0, 5)) { // Show first 5 files
    slack += `  - \`${file.Key.split('/').pop()}\` (${formatBytes(file.Size)})\n`;
  }

  if (data.files.length > 5) {
    slack += `  _...and ${data.files.length - 5} more files_\n`;
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

    console.log(`Found ${files.length} files in ${latestFolder}\n`);

    const slackMessage = await generateSlackReport({
      folder: latestFolder,
      files
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
