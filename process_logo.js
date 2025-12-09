const Jimp = require('jimp');
const path = require('path');

const inputPath = path.join(__dirname, 'client', 'public', 'golden_stamp.png');
const outputPath = path.join(__dirname, 'client', 'public', 'golden_stamp_transparent.png');

async function processImage() {
    try {
        console.log(`Reading image from: ${inputPath}`);
        const image = await Jimp.read(inputPath);

        console.log('Applying circular crop...');
        // Circle crop to remove corners
        image.circle();

        // Optional: Resize slightly if needed, but circle should be enough if centered

        console.log(`Writing image to: ${outputPath}`);
        await image.writeAsync(outputPath);

        console.log('Success! Image processed.');
    } catch (error) {
        console.error('Error processing image:', error);
        process.exit(1);
    }
}

processImage();
