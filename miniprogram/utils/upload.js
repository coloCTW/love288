/* ═══════════════════════════════════════════════════════════════════
   两个人的小世界 · 图片选择 + 云存储上传
   chooseAndUpload(limit, folder) → Promise<[{ fileID, tempPath }]>
   tempPath 用于本地预览，fileID 用于提交接口（cloud:// 可直接渲染）。
   ═══════════════════════════════════════════════════════════════════ */
const MAX = 9;
const FALLBACK_MSG = '照片好像没有传上去，再试一次吧～';

function extOf(path) {
  const m = /\.(\w+)$/.exec(path || '');
  return m ? m[1].toLowerCase() : 'jpg';
}

function uploadOne(tempPath, folder) {
  const ext = extOf(tempPath);
  const cloudPath = folder + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
  return new Promise(function (resolve, reject) {
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempPath,
      success: function (res) { resolve({ fileID: res.fileID, tempPath: tempPath }); },
      fail: function () { reject(new Error(FALLBACK_MSG)); }
    });
  });
}

function chooseAndUpload(limit, folder) {
  const count = Math.min(MAX, Math.max(1, limit || 1));
  return new Promise(function (resolve, reject) {
    wx.chooseMedia({
      count: count,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const files = res.tempFiles || [];
        if (!files.length) { resolve([]); return; }
        Promise.all(files.map(function (f) {
          return uploadOne(f.tempFilePath, folder);
        })).then(resolve, reject);
      },
      fail: function () {
        /* 用户取消选择：按空结果处理，不打扰 */
        resolve([]);
      }
    });
  });
}

module.exports = { chooseAndUpload: chooseAndUpload, MAX: MAX, FALLBACK_MSG: FALLBACK_MSG };
