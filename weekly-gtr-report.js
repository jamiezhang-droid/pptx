const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const BUCKET = 'airdna-prod-reports';
const PREFIX = 'weekly-gtr/';
const MODEL_FILE = process.env.MODEL_FILE || './Model_Apr_File_2026_QoQ.xlsx';

const s3 = new S3Client({ region: 'us-east-1' });

async function getLatestGTRFolder() {
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

  const sortedFolders = folders.map(f => f.Prefix).sort().reverse();
  return sortedFolders[0];
}

async function downloadGTRFile(folderPath) {
  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: folderPath
  });

  const response = await s3.send(listCommand);
  const xlsxFiles = (response.Contents || []).filter(f => f.Key.endsWith('.xlsx'));

  if (xlsxFiles.length === 0) {
    throw new Error('No xlsx files found in ' + folderPath);
  }

  // Get the GTR Weekly file (adjust filter if needed)
  const gtrFile = xlsxFiles.find(f => f.Key.toLowerCase().includes('gtr')) || xlsxFiles[0];

  console.log(`Downloading: ${gtrFile.Key}`);

  const getCommand = new GetObjectCommand({
    Bucket: BUCKET,
    Key: gtrFile.Key
  });

  const getResponse = await s3.send(getCommand);
  const chunks = [];
  for await (const chunk of getResponse.Body) {
    chunks.push(chunk);
  }

  return {
    buffer: Buffer.concat(chunks),
    fileName: path.basename(gtrFile.Key)
  };
}

function extractGTRData(gtrBuffer) {
  const workbook = XLSX.read(gtrBuffer, { type: 'buffer' });

  // Extract ABNB tab
  const abnbSheet = workbook.Sheets['ABNB'];
  if (!abnbSheet) {
    throw new Error('ABNB sheet not found in GTR report');
  }

  // Extract Airbnb Summary values
  const summarySheet = workbook.Sheets['Airbnb Summary'];
  if (!summarySheet) {
    console.warn('Warning: "Airbnb Summary" sheet not found. Available sheets:', workbook.SheetNames.join(', '));
  }

  const gtrL11 = summarySheet ? summarySheet['L11'] : null;
  const gtrAK11 = summarySheet ? summarySheet['AK11'] : null;

  return {
    abnbSheet,
    abnbSheetData: XLSX.utils.sheet_to_json(abnbSheet, { header: 1 }),
    gtrL11: gtrL11 ? gtrL11.v : null,
    gtrAK11: gtrAK11 ? gtrAK11.v : null,
    sheetNames: workbook.SheetNames
  };
}

function updateModelFile(modelPath, gtrData) {
  const workbook = XLSX.readFile(modelPath);

  // 1. Replace ABNB tab with GTR data
  const newAbnbSheet = XLSX.utils.aoa_to_sheet(gtrData.abnbSheetData);
  workbook.Sheets['ABNB'] = newAbnbSheet;
  console.log('✓ Updated ABNB tab with GTR data');

  // 2. Update N1 in Line chart_nights (increment week number)
  const lineChartSheet = workbook.Sheets['Line chart_nights'];
  const currentN1 = lineChartSheet['N1'] ? lineChartSheet['N1'].v : 0;
  const newWeekNum = currentN1 + 1;

  lineChartSheet['N1'] = { t: 'n', v: newWeekNum };
  console.log(`✓ Updated N1 from ${currentN1} to ${newWeekNum}`);

  // 3. Get model values for comparison (after formula recalc these would update)
  // Note: xlsx library doesn't recalculate formulas, so we read current values
  const modelN5 = lineChartSheet['N5'] ? lineChartSheet['N5'].v : null;
  const modelN10 = lineChartSheet['N10'] ? lineChartSheet['N10'].v : null;

  // Save updated model file
  const outputPath = modelPath.replace('.xlsx', `_updated_week${newWeekNum}.xlsx`);
  XLSX.writeFile(workbook, outputPath);
  console.log(`✓ Saved updated file: ${outputPath}`);

  return {
    previousWeek: currentN1,
    newWeek: newWeekNum,
    modelN5,
    modelN10,
    outputPath
  };
}

function compareValues(modelVal, gtrVal, label) {
  if (modelVal === null || gtrVal === null) {
    return { label, status: '⚠️', message: 'Missing value', modelVal, gtrVal };
  }

  // Compare first digit
  const modelFirstDigit = String(Math.abs(modelVal))[0];
  const gtrFirstDigit = String(Math.abs(gtrVal))[0];

  const match = modelFirstDigit === gtrFirstDigit;

  return {
    label,
    status: match ? '✅' : '❌',
    message: match ? 'First digit matches' : 'First digit MISMATCH',
    modelVal: typeof modelVal === 'number' ? modelVal.toFixed(4) : modelVal,
    gtrVal: typeof gtrVal === 'number' ? gtrVal.toFixed(4) : gtrVal,
    modelFirstDigit,
    gtrFirstDigit
  };
}

function generateSlackReport(data) {
  const date = new Date().toISOString().split('T')[0];

  let slack = `*Weekly GTR Report Update*\n`;
  slack += `_Generated: ${date}_\n\n`;

  slack += `*Week Update:* ${data.previousWeek} → ${data.newWeek}\n`;
  slack += `*GTR File:* \`${data.gtrFileName}\`\n\n`;

  slack += `*Validation Checks:*\n`;

  data.comparisons.forEach(c => {
    slack += `${c.status} *${c.label}:* ${c.message}\n`;
    slack += `   Model: \`${c.modelVal}\` | GTR: \`${c.gtrVal}\`\n`;
  });

  slack += `\n*Output File:* \`${data.outputPath}\`\n`;

  if (data.comparisons.some(c => c.status === '❌')) {
    slack += `\n⚠️ *Action Required:* Some validations failed. Please review manually.`;
  } else {
    slack += `\n✅ *All validations passed!*`;
  }

  return slack;
}

async function main() {
  try {
    console.log('=== Weekly GTR Report Automation ===\n');

    // 1. Get latest GTR folder from S3
    console.log('1. Finding latest GTR folder...');
    const latestFolder = await getLatestGTRFolder();
    console.log(`   Found: ${latestFolder}\n`);

    // 2. Download GTR file
    console.log('2. Downloading GTR file...');
    const { buffer: gtrBuffer, fileName: gtrFileName } = await downloadGTRFile(latestFolder);
    console.log(`   Downloaded: ${gtrFileName}\n`);

    // 3. Extract data from GTR
    console.log('3. Extracting GTR data...');
    const gtrData = extractGTRData(gtrBuffer);
    console.log(`   GTR L11: ${gtrData.gtrL11}`);
    console.log(`   GTR AK11: ${gtrData.gtrAK11}\n`);

    // 4. Update model file
    console.log('4. Updating model file...');
    const modelResult = updateModelFile(MODEL_FILE, gtrData);
    console.log('');

    // 5. Compare values
    console.log('5. Validating...');
    const comparisons = [
      compareValues(modelResult.modelN5, gtrData.gtrL11, 'N5 vs L11'),
      compareValues(modelResult.modelN10, gtrData.gtrAK11, 'N10 vs AK11')
    ];

    comparisons.forEach(c => console.log(`   ${c.status} ${c.label}: ${c.message}`));
    console.log('');

    // 6. Generate Slack report
    const slackMessage = generateSlackReport({
      ...modelResult,
      gtrFileName,
      comparisons
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
