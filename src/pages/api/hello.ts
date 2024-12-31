// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import * as formidable from 'formidable';
import mammoth from "mammoth";
import OpenAI from 'openai';
import fs from 'fs';


const API_KEY = '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';
const openai = new OpenAI({
  apiKey: API_KEY
});


export const config = {
  api: {
    bodyParser: false, // Disable the body parser for file uploads
  },
};
interface NextApiRequestWithFile extends NextApiRequest {
  file: Express.Multer.File; // Adding the file type to the NextApiRequest interface
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = new formidable.IncomingForm();

  // Parse the incoming request
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error in file upload:", err);
      return res.status(500).json({ error: "File upload failed" });
    }
    console.log('Form parsing successful');
    console.log('Fields:', fields);  // Log fields (additional data sent with the form)
    console.log('Files:', files);
    try {
      const uploadedFile = files.file;

      if (!uploadedFile || !Array.isArray(uploadedFile)) {
        return res.status(400).json({ error: "No file uploaded or invalid file format" });
      }

      const file = uploadedFile[0];  
      const filePath = file.filepath;
      const fileBuffer = await fs.promises.readFile(filePath); // Read file buffer
      console.log('File read successfully:', fileBuffer);
      const { value: docxText } = await mammoth.extractRawText({ buffer: fileBuffer });
      if (!docxText) {
        return res.status(400).json({ error: "Failed to extract text from the DOCX file" });
      }
      console.log('File read successfully:', docxText);
      // Prepare prompt for translation
      const prompt = `Rewrite the following text in modern English:\n\n${docxText}`;

      // Make request to OpenAI API for translation (ensure your OpenAI client is configured properly)
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system', 
            content: 'You are a helpful assistant who translates text into modern English.'
          },
          {
            role: 'user', 
            content: `Translate the following text into modern English:\n\n${docxText}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const modernEnglishText = completion.choices[0]?.message?.content || '';

      res.status(200).json({
        originalText: docxText,
        translatedText: modernEnglishText,
      });
    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).json({ error: 'Failed to process the file or translate the text' });
    }
  });
};

export default handler;

