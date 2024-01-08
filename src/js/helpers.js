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