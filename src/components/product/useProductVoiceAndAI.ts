import { useState } from 'react';
import { callGeminiAI } from '../../services/geminiService';
import { Brand } from '../../types';

interface UseProductVoiceAndAIProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  brands: Brand[];
}

export function useProductVoiceAndAI({
  formData,
  setFormData,
  brands
}: UseProductVoiceAndAIProps) {
  const [isVoiceScanning, setIsVoiceScanning] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Voice Recognition & AI Parsing
  const startVoiceEntry = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsVoiceScanning(true);
    recognition.start();

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      recognition.stop();
      setIsVoiceScanning(false);

      if (!transcript) return;

      setIsGeneratingDescription(true); 
      try {
        const systemPrompt = `L'utilisateur a dit: "${transcript}". 
        Extrais les informations du produit au format JSON: 
        {"name": "Nom du produit", "price": "Prix numérique", "description": "Brève description", "quantity": "quantité si mentionnée"}.
        Si une information manque, mets null.
        Réponds uniquement au format JSON strict.`;

        const responseText = await callGeminiAI({}, "Extrais le JSON du produit.", systemPrompt);
        const result = JSON.parse(responseText.replace(/```json|```/g, '').trim());
        
        setFormData((prev: any) => ({
          ...prev,
          name: result.name || prev.name,
          price: result.price?.toString() || prev.price,
          description: result.description || prev.description
        }));
      } catch (error) {
        console.error("Voice AI parsing error:", error);
      } finally {
        setIsGeneratingDescription(false);
      }
    };

    recognition.onerror = () => {
      setIsVoiceScanning(false);
      recognition.stop();
    };

    recognition.onend = () => {
      setIsVoiceScanning(false);
    };
  };

  const generateAiDescription = async () => {
    if (!formData.name) {
      alert("Veuillez d'abord saisir le nom du produit.");
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const brandName = brands.find(b => b.id === formData.brandId)?.name || '';
      const userPrompt = `Génère une description courte et attractive (environ 100-150 caractères) pour un produit nommé "${formData.name}"${brandName ? ` de la marque "${brandName}"` : ''}. Le ton doit être professionnel et accrocheur. Réponds uniquement avec la description.`;
      
      const responseText = await callGeminiAI({}, userPrompt);
      if (responseText) {
        setFormData((prev: any) => ({ ...prev, description: responseText.trim() }));
      }
    } catch (error: any) {
      console.error("Error generating description:", error);
      const errorMessage = error.message || String(error);
      if (errorMessage.includes("Quota atteint") || errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("credits")) {
        alert("Impossible de générer la description : Votre quota d'utilisation de l'IA (ou vos crédits Google AI Studio) est épuisé.");
      } else {
        alert(`Erreur lors de la génération de la description : ${errorMessage}`);
      }
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return {
    isVoiceScanning,
    isGeneratingDescription,
    startVoiceEntry,
    generateAiDescription
  };
}
