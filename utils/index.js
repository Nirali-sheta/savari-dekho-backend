

// Function to get the file extension from the filename for profilePic
const getFileExtension = (filename) => {
    const ext = filename.split('.').pop();
    return ext ? `.${ext}` : '';
};

// Function to validate file extensions
const validateFileExtension = (fileExtension) => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'JPG', 'JPEG', 'PNG'];
    return validExtensions.some(ext => fileExtension.includes(ext));
}


module.exports = {
    getFileExtension,
    validateFileExtension,
    ...require('./mobileVerification'),
    EmailSender: require('./sendEmail'),
    ...require("./mapHelper"),
}