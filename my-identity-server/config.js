require('dotenv').config();
const fs = require('fs');

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const scriptContent = `
<script>
  window.CLIENT_ID = '${clientId}';
  window.CLIENT_SECRET = '${clientSecret}';
</script>
`;

fs.writeFileSync('./public/config.js', scriptContent);
console.log('config.js generated successfully.');
