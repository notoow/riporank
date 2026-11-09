const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, 'assets', 'models');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const copyList = [
  { src: 'references/3d/cow-idle/source/cow simple all.glb', dest: 'assets/models/cow.glb' },
  { src: 'references/3d/human_body.glb', dest: 'assets/models/human_body.glb' },
  { src: 'references/3d/new_thin_barrel.glb', dest: 'assets/models/new_thin_barrel.glb' },
  { src: 'references/3d/thinker_rodin_4k_tris.glb', dest: 'assets/models/thinker_rodin.glb' },
  { src: 'references/3d/tyrannosarus_rex_free_model.glb', dest: 'assets/models/tyrannosaurus_rex.glb' }
];

copyList.forEach(item => {
  const srcPath = path.join(__dirname, item.src);
  const destPath = path.join(__dirname, item.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`[COPIED] ${item.src} -> ${item.dest} (${(fs.statSync(destPath).size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log(`[MISSING SRC] ${srcPath}`);
  }
});
