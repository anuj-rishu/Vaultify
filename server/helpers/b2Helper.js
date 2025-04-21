const B2 = require('backblaze-b2');
const logger = require('../utils/logger');

class B2Helper {
  constructor() {
    this.b2 = new B2({
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
      applicationKey: process.env.B2_APPLICATION_KEY
    });
    this.bucketId = process.env.B2_BUCKET_ID;
    this.bucketName = process.env.B2_BUCKET_NAME;
    this.isAuthorized = false;
  }

  async authorize() {
    if (this.isAuthorized) return;

    try {
      await this.b2.authorize();
      this.isAuthorized = true;
      this.downloadUrl = this.b2.downloadUrl;
    } catch (error) {
      logger.error('B2 authorization error:', error);
      throw new Error('Failed to authorize B2: ' + error.message);
    }
  }

  async uploadFile(fileName, data, contentType) {
    try {
      await this.authorize();

      const { data: uploadUrlResponse } = await this.b2.getUploadUrl({
        bucketId: this.bucketId
      });

      const uploadResult = await this.b2.uploadFile({
        uploadUrl: uploadUrlResponse.uploadUrl,
        uploadAuthToken: uploadUrlResponse.authorizationToken,
        fileName: fileName,
        data: data,
        contentType: contentType
      });
      return uploadResult.data;
    } catch (error) {
      logger.error(`B2 upload error for file ${fileName}:`, error);
      throw new Error('Failed to upload file to B2: ' + error.message);
    }
  }

  getDownloadUrl(fileName) {
    return `${this.downloadUrl}/file/${this.bucketName}/${fileName}`;
  }

  async deleteFile(fileId, fileName) {
    try {
      await this.authorize();

      const response = await this.b2.deleteFileVersion({
        fileId: fileId,
        fileName: fileName
      });
      return response.data;
    } catch (error) {
      logger.error(`B2 delete error for file ${fileName} (ID: ${fileId}):`, error);
      throw new Error('Failed to delete file from B2: ' + error.message);
    }
  }
}

module.exports = new B2Helper();