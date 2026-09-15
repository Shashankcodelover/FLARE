const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'flare-disaster-response',
    mesh_active: true,
    crdt_sync: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Static assets serving
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback SPA route
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('<!DOCTYPE html><html><head><title>FLARE Disaster Response</title></head><body><h1>FLARE System Active</h1></body></html>');
  }
});

module.exports = app;
