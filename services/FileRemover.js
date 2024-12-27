const fs = require('fs');


function removeFile(filePath) {
    return new Promise((res, rej) => {
        if (!filePath) rej(new Error("Invalid file path"));

        try {
            fs.unlinkSync(filePath)
            res();
        } catch (error) {
            rej(error);
        }
    })
}

module.exports = removeFile;