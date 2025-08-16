import { mastra } from "@/lib/mastra";
 
export async function POST() {
  const myAgent = mastra.getAgent("weatherAgent");

  const response = await myAgent.stream({
    messages: [
      {
        role: "user",
        content: "Tell me a story",
      },
    ],
  });
   
  // Process data stream with the processDataStream util
  response.processDataStream({
    onTextPart: (text: string) => {
      console.log(text);
    },
    onFilePart: (file: unknown) => {
      console.log(file);
    },
    onDataPart: (data: unknown) => {
      console.log(data);
    },
    onErrorPart: (error: unknown) => {
      console.error(error);
    },
  });

}