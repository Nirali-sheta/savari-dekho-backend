const { APP_PORT } = require("../config");
const { getFileExtension } = require("../utils");
const fs = require('fs');
const port = process.env.NODE_ENV === 'production' ? "" : `:${APP_PORT}`;

// Folder Name
const saveDir = 'uploads';


function saveFile(req) {
    return new Promise((res, rej) => {
        // Create uploads folder if it doesnt exist
        try {
            if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir)
        } catch (error) {
            rej(error);
        }

        const file = req.file;

        const fileExt = getFileExtension(file.originalname);
        const fileName = `${req.body.mobileNumber}${fileExt}`;

        const savePath = `${saveDir}/${req.userId}/${fileName}`
        const fileUrl = `${req.protocol}://${req.hostname}${port}/${fileName}`;
        try {
            fs.writeFileSync(savePath, file.buffer);
            res({ fileUrl, savePath });
        } catch (error) {
            rej(error);
        }
    })
}

module.exports = saveFile;