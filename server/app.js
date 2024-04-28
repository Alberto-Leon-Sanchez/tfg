import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import cors from 'cors';

import {
  S3,
} from "@aws-sdk/client-s3";

let volumeBasedAttackCount = 15;
let applicationLayerAttackCount = 33;
let benignCount = 0;

let volumeBasedAttackPercentage = 0;
let applicationLayerAttackPercentage = 0;
let benignPercentage = 0;

let totalCount = 0;

const app = express();

const s3 = new S3({ credentials });
const bucket = 'tfgresults';
const prefix = 'results/';

const __dirname = import.meta.dirname;

app.use(cors());

app.get('/conexions', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'results.csv');
    const data = await fs.readFile(filePath, 'utf-8');
    const parsedData = parseResults(data);

    res.json(parsedData);
  } catch (error) {
    console.error('Error reading stats file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'stats.json');
    const data = await fs.readFile(filePath, 'utf-8');
    
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading stats file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
    
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


function get_new_data(){
  fs.readFile('results.csv', 'utf-8')
    .then(data => {
      const parsedData = parseResults(data);
      calculateStats(parsedData);
    })
    .catch(error => {
      console.error('Error reading stats file:', error);
    });

    const stats = {
      Benign: `${benignCount}`,
      Volume: `${volumeBasedAttackCount}`,
      Application: `${applicationLayerAttackCount}`,
      chartData: {
        series: [benignPercentage, volumeBasedAttackPercentage, applicationLayerAttackPercentage]
      }
    };
    retrieveDownloadAndDeleteObjects()
    fs.writeFile('stats.json', JSON.stringify(stats, null, 2))
}

function parseResults(data){
  const lines = data.split('\n');

  const headers = lines[0].split(',');

  const parsedData = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(',');
      const entry = {};

      for (let j = 0; j < headers.length; j++) {
        entry[headers[j]] = values[j];
      }

      parsedData.push(entry);
    }
  }

  return parsedData;
}

function calculateStats(data){
  data.forEach(entry => {
    const volumeBasedAttack = parseFloat(entry['Volume_Based_Attack']);
    const applicationLayerAttack = parseFloat(entry['Application_Layer_Attack']);
    const benign = parseFloat(entry['Benign']);
  
    const maxClass = Math.max(volumeBasedAttack, applicationLayerAttack, benign);
  
    if (maxClass === volumeBasedAttack) {
      volumeBasedAttackCount++;
    } else if (maxClass === applicationLayerAttack) {
      applicationLayerAttackCount++;
    } else {
      benignCount++;
    }

    totalCount = volumeBasedAttackCount + applicationLayerAttackCount + benignCount;
    
    volumeBasedAttackPercentage = (volumeBasedAttackCount / totalCount) * 100;
    applicationLayerAttackPercentage = (applicationLayerAttackCount / totalCount) * 100;
    benignPercentage = (benignCount / totalCount) * 100;
  });
}

const listObjects = async () => {
  try {
    const data = await s3.listObjectsV2({ Bucket: bucket, Prefix: prefix });

    if (!data.Contents) {
      return [];
    }

    return data.Contents.map(obj => obj.Key);
  } catch (err) {
    console.error('Error listing objects:', err);
    throw err;
  }
};

const downloadObject = async (key) => {
  const downloadParams = {
    Bucket: bucket,
    Key: key
  };

  try {
    const data = await s3.getObject(downloadParams);
    return data.Body;
  } catch (err) {
    console.error('Error downloading object:', err);
    throw err;
  }
};

const deleteObjects = async (keys) => {
  const deleteParams = {
    Bucket: bucket,
    Delete: {
      Objects: keys.map(Key => ({ Key })),
      Quiet: false
    }
  };

  try {
    const data = await s3.deleteObjects(deleteParams);
    console.log('Deleted objects:', data.Deleted);
  } catch (err) {
    console.error('Error deleting objects:', err);
    throw err;
  }
};

const retrieveDownloadAndDeleteObjects = async () => {
  try {
    const objectKeys = await listObjects();
    if (objectKeys.length === 0) {
      console.log('No objects with prefix "results/" to delete.');
      return;
    }
    
    let firstFile = true;
    const destinationFile = 'results.csv';

    for (const key of objectKeys) {
      const fileContent = await downloadObject(key);
      const contentToWrite = firstFile ? fileContent : fileContent.toString().split('\n').slice(1).join('\n');
      if (firstFile) {
        fs.writeFile(destinationFile, contentToWrite);
        firstFile = false;
      } else {
        fs.appendFile(destinationFile, contentToWrite);
      }
    }

    console.log('Merged files saved as:', destinationFile);
    
    await deleteObjects(objectKeys);
  } catch (err) {
    console.error('Error retrieving, downloading, and deleting objects:', err);
  }
};

setInterval(get_new_data, 5000);