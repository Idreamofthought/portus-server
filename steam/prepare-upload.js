import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Prepare SteamPipe scripts; never log in, upload, or publish a build.
const [appId, depotId, suppliedContent] = process.argv.slice(2);
if (!/^[1-9]\d*$/.test(appId ?? '') || !/^[1-9]\d*$/.test(depotId ?? '') || !suppliedContent) {
  console.error('Usage: npm run steam:prepare -- <AppID> <WindowsDepotID> <unpacked-Windows-folder>');
  process.exit(1);
}
const content = path.resolve(suppliedContent);
const required = ['Portus.exe', 'resources/app.asar', 'LICENSE.electron.txt', 'LICENSES.chromium.html'];
for (const file of required) {
  try { await access(path.join(content, file)); }
  catch { throw new Error(`Incomplete Windows package: missing ${file}. Use the entire unpacked ZIP.`); }
}
// VDF uses quoted strings: normalize Windows separators and reject injection.
const vdfPath = value => {
  if (/["\r\n\0]/.test(value)) throw new Error('Unsupported character in build path');
  return value.replaceAll('\\', '/');
};
const destination = path.resolve('dist/steam', appId);
const contentRoot = vdfPath(content);
const output = vdfPath(path.join(destination, 'output'));
await mkdir(destination, { recursive: true });
const depotFile = `depot_build_${depotId}.vdf`;
await writeFile(path.join(destination, depotFile), `"DepotBuildConfig"\n{\n  "DepotID" "${depotId}"\n  "ContentRoot" "${contentRoot}"\n  "FileMapping"\n  {\n    "LocalPath" "*"\n    "DepotPath" "."\n    "recursive" "1"\n  }\n}\n`);
for (const preview of [true, false]) {
  const filename = preview ? `app_build_${appId}_preview.vdf` : `app_build_${appId}.vdf`;
  await writeFile(path.join(destination, filename), `"AppBuild"\n{\n  "AppID" "${appId}"\n  "Desc" "Portus Windows offline build"\n  "BuildOutput" "${output}"\n  "ContentRoot" "${contentRoot}"\n  "Preview" "${preview ? 1 : 0}"\n  "Depots"\n  {\n    "${depotId}" "${depotFile}"\n  }\n}\n`);
}
console.log(`SteamPipe scripts prepared in ${destination}. No upload performed. Run the preview script first.`);
