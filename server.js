const express = require('express');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Biar frontend Netlify bisa akses
app.use((req,res,next)=>{
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/', (req,res)=> res.json({ status: 'SanzDownloader Backend Jalan!', endpoints: ['/api/info?url=', '/api/download?url=&format='] }));

// 1. Ambil info video: judul, thumbnail, author, pilihan kualitas
app.get('/api/info', async (req,res)=>{
  const { url } = req.query;
  if(!url) return res.status(400).json({ error: 'URL wajib diisi' });
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer: https://www.google.com']
    });
    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      uploader: info.uploader || info.channel || 'Unknown',
      duration: info.duration,
      webpage_url: info.webpage_url,
      formats: (info.formats || []).filter(f=>f.ext==='mp4' && f.height).map(f=>({ height: f.height, filesize: f.filesize, format_id: f.format_id })).slice(-5),
      // link langsung kualitas terbaik
      best: info.url || null
    });
  } catch(e){
    console.error(e);
    res.status(500).json({ error: 'Gagal ambil info. Link mungkin private / dibatasi platform.', detail: String(e).slice(0,300) });
  }
});

// 2. Download langsung - redirect ke file asli
app.get('/api/download', async (req,res)=>{
  const { url, format } = req.query;
  if(!url) return res.status(400).json({ error: 'URL wajib diisi' });
  try {
    // format: best / 720 / 1080 / mp3
    let formatStr = 'best[ext=mp4]/best';
    if(format === 'mp3') formatStr = 'bestaudio[ext=m4a]/bestaudio/best';
    if(format === '720') formatStr = 'best[height<=720][ext=mp4]/best[height<=720]/best';
    if(format === '1080') formatStr = 'best[height<=1080][ext=mp4]/best[height<=1080]/best';
    if(format === '480') formatStr = 'best[height<=480][ext=mp4]/best[height<=480]/best';

    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: formatStr
    });
    if(!info.url) throw new Error('No direct URL');
    // Redirect ke file asli - browser langsung download
    res.redirect(info.url);
  } catch(e){
    console.error(e);
    res.status(500).json({ error: 'Gagal download. Coba link lain / coba lagi.' });
  }
});

app.listen(PORT, ()=> console.log('SanzDownloader backend jalan di port ' + PORT));
