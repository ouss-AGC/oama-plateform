const { Jimp } = require('jimp');
const path = require('path');

const inputPath = path.join(__dirname, '../client/public/signature_old.png');
const outputPath = path.join(__dirname, '../client/public/signature.png');

async function processImage() {
    try {
        const image = await Jimp.read(inputPath);

        // Iterate over all pixels
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];

            // Calculate brightness/whiteness
            // If the pixel is close to white (e.g., > 200 for all channels), make it transparent
            if (red > 200 && green > 200 && blue > 200) {
                this.bitmap.data[idx + 3] = 0; // Set alpha to 0 (transparent)
            }
        });

        await new Promise((resolve, reject) => {
            image.write(outputPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('Signature processed and saved to:', outputPath);
    } catch (err) {
        console.error('Error processing image:', err);
    }
}

processImage();
