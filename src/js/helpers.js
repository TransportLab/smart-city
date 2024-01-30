import fs from 'fs';
import json5 from 'json5';

// Function to read and parse the JSON5 file
export function parseJson5File(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return json5.parse(fileContent);
    } catch (error) {
      console.error('Error reading or parsing JSON5 file:', error);
      return null;
    }
}

// Function to read and parse the 
export function parseCSVtoDict(filePath, key_string, value_string) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let out = Papa.parse(fileContent, {
            header: true,
            complete: function(results) {
                let out = {};
                results.data.forEach(function(row) {
                    var key = row[key_string];
                    var value = row[value_string];
                    out[key] = value;
                });
            return out;
            }
        });
        return out;
    } catch (error) {
        console.error('Error reading or parsing JSON5 file:', error);
        return null;
    }
}

export function formatDateTime(date) {
    const year = date.getUTCFullYear();
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2); // Months are zero-based
    const day = ('0' + date.getUTCDate()).slice(-2);
    const hours = ('0' + date.getUTCHours()).slice(-2);
    const minutes = ('0' + date.getUTCMinutes()).slice(-2);

    return `${year}${month}${day}${hours}${minutes}`;
}