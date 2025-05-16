import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
    Image, Modal, FlatList, Linking, Dimensions, Platform, AppState, ActivityIndicator,
    KeyboardAvoidingView, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable'; // Added for animations

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// --- Screen Size Adaptation ---
const IS_SMALL_SCREEN = screenWidth < 380;
// Scale Factor for Small Screens (0.85 = 15% smaller, 0.75 = 25% smaller)
// Adjust this S_SF value if you want a different level of "compactness" on small mobile screens.
// A literal 75% reduction (S_SF = 0.25) would make text and elements too tiny.
// This makes elements 15% smaller on small screens.
const S_SF = IS_SMALL_SCREEN ? 0.85 : 1;
const scale = (value) => Math.round(value * S_SF);
const scaleFont = (value) => Math.round(value * S_SF); // Can have a different factor for fonts if needed

const APP_NAME_DISPLAY = "WalkerTECH-AI-Financer";
const SIDEBAR_WIDTH = scale(70);

// --- THEME DEFINITIONS ---
// Themes remain the same, but styles using them will be scaled
const themes = {
    dark: {
        bgPage: '#121212', bgPrimary: '#1E1E1E', bgSecondary: '#242424', bgTertiary: '#2C2C2C',
        bgCard: '#2C2C2C', bgInputArea: '#1E1E1E', bgElevation1: 'rgba(255, 255, 255, 0.08)',
        textPrimary: '#E0E0E0', textSecondary: '#A0A0A0', textPlaceholder: '#757575',
        textOnAccent: '#FFFFFF', accentPrimary: '#BB86FC', accentSecondary: '#03DAC6',
        borderColor: '#3A3A3A', dividerColor: '#4A4A4A', danger: '#CF6679', success: '#66BB6A',
        warning: '#FFD54F', info: '#4FC3F7', infoLink: '#4FC3F7', magenta: '#F06292',
        statusBar: 'light-content', inputBg: '#2C2C2C', messageUserBg: '#3700B3',
        messageUserText: '#FFFFFF', messageAiBg: '#383838', messageAiText: '#E0E0E0',
        iconDefault: '#A0A0A0', iconMuted: '#757575', buttonText: '#FFFFFF', shadowColor: '#000',
        plotlyBg: '#1E1E1E', 
        sidebarGradient: ['#333333', '#222222', '#111111'],
        inputBorderGradient: ['#BB86FC', '#3A3A3A'], greetingHeader: '#F06292', menuBg: '#1E1E1E',
        switchActiveBg: '#BB86FC', bannerBg: '#3700B3', bgWhite: '#1E1E1E', bgSurface: '#242424',
        cardBorderGreen: '#66BB6A', cardBorderYellow: '#FFD54F', cardBorderBlue: '#4FC3F7',
        cardBorderMagenta: '#F06292', appNameUnderline: '#BB86FC',
    },
    light: {
        bgPage: '#F9F6FE', bgPrimary: '#FFFFFF', bgSecondary: '#FDFCFE', bgTertiary: '#F4F0F8',
        bgCard: '#FFFFFF', bgInputArea: '#FFFFFF', bgElevation1: 'rgba(0, 0, 0, 0.04)',
        textPrimary: '#1C1C1E', textSecondary: '#555259', textPlaceholder: '#A09DA6',
        textOnAccent: '#FFFFFF', accentPrimary: '#6A1B9A', accentSecondary: '#007AFF',
        borderColor: '#E8E4ED', dividerColor: '#DCD8E0', danger: '#D32F2F', success: '#388E3C',
        warning: '#FFA000', info: '#1976D2', infoLink: '#007AFF', magenta: '#C2185B',
        statusBar: 'dark-content', inputBg: '#FFFFFF', messageUserBg: '#625B71',
        messageUserText: '#FFFFFF', messageAiBg: '#ECE6F0', messageAiText: '#1D1B20',
        iconDefault: '#49454F', iconMuted: '#79747E', buttonText: '#FFFFFF', shadowColor: '#A0AEC0',
        plotlyBg: '#FFFFFF', 
        sidebarGradient: ['#FF416C', '#FFDEB4'],
        inputBorderGradient: ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'],
        greetingHeader: '#E53170', menuBg: '#F8F5FD', switchActiveBg: '#625B71',
        bannerBg: '#4A0072', bgWhite: '#FFFFFF', bgSurface: '#FEF7FF',
        cardBorderGreen: '#34C759', cardBorderYellow: '#FFCC00', cardBorderBlue: '#007AFF',
        cardBorderMagenta: '#AF52DE', appNameUnderline: '#E53170',
    }
};

const banksData = [
    { id: 'none', name: 'Nenhum Banco', logoUrl: 'https://img.icons8.com/pastel-glyph/64/bank.png' },
    { id: 'sicredi', name: 'Sicredi', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4bNPBNh_Fi7JnwSBAzyHHW6bKiatUbDWWaA&s' },
    { id: 'sicoob', name: 'Sicoob', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVmbvMMo-E0hWm_rLIX4N1YB8npKy3xF9SfQ&s' },
    { id: 'bb', name: 'Banco do Brasil', logoUrl: 'https://t.ctcdn.com.br/uty-qsFeDcV-IrDWVSpY3HmGx_g=/i620291.jpeg' },
    { id: 'picpay', name: 'PicPay', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDtbk9XZwgTpl3XIld87jFzUtk2XVfxLoysA&s' },
    { id: 'itau', name: 'Itaú Unibanco', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banco_Ita%C3%BA_logo.svg/1011px-Banco_Ita%C3%BA_logo.svg.png' },
    { id: 'bradesco', name: 'Bradesco', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDNVTc3mhbojIWSX9gonGIPaDetl3AhP66kA&s' },
    { id: 'santander', name: 'Santander', logoUrl: 'https://assets.hgbrasil.com/finance/companies/big/santander-br.png' },
    { id: 'caixa', name: 'Caixa Econômica', logoUrl: 'https://www.aconjurpr.com.br/wp-content/uploads/2017/03/CAIXA.png' },
];

const initialSuggestions = [
    { text: "Crie uma tabela comparativa entre guardar dinheiro na poupança e viver apenas com o salário, destacando fatores como poder de compra ao longo do tempo, impacto da inflação, rendimento real, estabilidade financeira, imprevistos, planejamento de metas e segurança financeira no longo prazo.", borderColorThemeKey: "cardBorderGreen", icon: "account-balance" },
    { text: "Crie uma tabela comparativa entre diferentes tipos de aplicações financeiras no Brasil — como Poupança, CDB, Tesouro Direto, Fundos de Investimento e Ações — destacando critérios como rentabilidade média, liquidez, risco, imposto de renda, aplicação mínima e recomendação de perfil de investidor (conservador, moderado, arrojado)", borderColorThemeKey: "cardBorderYellow", icon: "storefront" },
    { text: "Crie uma tabela comparativa entre aposentadoria pública (INSS) e aposentadoria privada (como PGBL/VGBL), destacando critérios como idade mínima, tempo de contribuição, valor médio recebido, teto de benefício, carência, tributação, flexibilidade, herança e riscos, voltada para trabalhadores CLT e autônomos.", borderColorThemeKey: "cardBorderBlue", icon: "trending-up" },
    { text: "Gere um gráfico de barras com Plotly.js comparando o rendimento anual simulado de R$10.000 em Poupança (0.5% a.m.), CDB 100% CDI (CDI 10% a.a.) e Tesouro Selic (Selic 10% a.a.) por 3 anos.", borderColorThemeKey: "warning", icon: "insert-chart" },
];

const AI_MODELS_DISPLAY = {
    "gemini-2.5-pro-preview-05-06": "Gemini 2.5 Pro (Preview)",
    "gemini-2.0-flash": "Gemini 2.0 Flash",
    "gemini-1.5-flash": "Gemini 1.5 Flash",
};
const GEMINI_MODEL_MAPPING = {
    "WalkerTECH_Pro_Max": "gemini-2.5-pro-preview-05-06",
    "WalkerTECH_1.5_Flash": "gemini-2.0-flash",
    "WalkerTECH_Compact_Pro": "gemini-1.5-pro",
};
const DEFAULT_MODEL_KEY = "WalkerTECH_Pro_Max";

const MAX_FILE_SIZE_MB = 25;
const MAX_HISTORY_ITEMS = 20;

let genAI;

export default function WalkerTECHFinancerAI() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [chatSession, setChatSession] = useState(null);
    const [currentView, setCurrentView] = useState('chat');

    const [selectedBank, setSelectedBank] = useState(banksData[0]);
    const [selectedAiModelKey, setSelectedAiModelKey] = useState(DEFAULT_MODEL_KEY);
    const [enableDeepResearch, setEnableDeepResearch] = useState(false);

    const [currentFile, setCurrentFile] = useState(null);

    const [themeMode, setThemeMode] = useState('light');
    const colors = themes[themeMode];

    const [userProfile, setUserProfile] = useState({ name: 'Investidor', email: 'investidor.pro@email.com', plan: 'pro' });
    const [analysisPreferences, setAnalysisPreferences] = useState({ risk: 'moderate', horizon: 'medium' });
    const [historyItems, setHistoryItems] = useState([]);

    const [menuModalVisible, setMenuModalVisible] = useState(false);
    const [bankModalVisible, setBankModalVisible] = useState(false);
    const [appNameDropdownVisible, setAppNameDropdownVisible] = useState(false);

    const [messageInput, setMessageInput] = useState('');
    const [aiMessageIdCounter, setAiMessageIdCounter] = useState(0);

    const scrollViewRef = useRef();
    const appState = useRef(AppState.currentState);
    const sidebarIconsRef = useRef([]);


    useEffect(() => {
        initializeApp();
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        // Animate sidebar icons on initial load
        sidebarIconsRef.current.forEach((ref, index) => {
            if (ref) {
                ref.transitionTo({ opacity: 1, translateY: 0 }, 500 + index * 100);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    useEffect(() => {
        AsyncStorage.setItem('appTheme', themeMode);
    }, [themeMode]);

    const showErrorToUser = (message) => {
        console.error("USER_ERROR_DISPLAY:", message);
        alert(message);
    };

    const initializeApp = async () => {
        setIsLoading(true);
        try {
            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || apiKey.length < 10) {
                 console.warn(
                    "***********************************************************************************\n" +
                    "ATENÇÃO: Chave da API Gemini (EXPO_PUBLIC_GEMINI_API_KEY) não configurada \n" +
                    "corretamente no arquivo .env ou é um valor placeholder.\n" +
                    "Verifique se o arquivo .env existe na raiz do projeto e contém a chave válida.\n" +
                    "Exemplo: EXPO_PUBLIC_GEMINI_API_KEY=\"SUA_CHAVE_REAL\"\n" +
                    "Após modificar o .env, REINICIE O METRO BUNDLER (npx expo start).\n" +
                    "A funcionalidade de IA pode não operar corretamente.\n" +
                    "***********************************************************************************"
                 );
            }
            
            genAI = new GoogleGenerativeAI(apiKey || 'FALLBACK_INVALID_KEY');


            try {
                await loadAppSettings();
                await loadUserProfile();
                await loadAnalysisPrefs();
                await loadChatHistory();
            } catch (error) {
                console.error("Error initializing app settings:", error);
                showErrorToUser("Erro ao carregar configurações do aplicativo.");
            }

            if (currentView === 'chat' && !currentSessionId) {
                await generateNewClientSessionId();
            }

        } catch (error) {
            console.error("CRITICAL: Error initializing GoogleGenerativeAI. This could be due to an invalid API key or network issues.", error);
            showErrorToUser(`Falha crítica ao inicializar o serviço de IA. Verifique a chave de API (EXPO_PUBLIC_GEMINI_API_KEY no .env) e a conexão. Detalhes: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAppStateChange = (nextAppState) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App has come to the foreground!');
        } else if (nextAppState.match(/inactive|background/)) {
            console.log('App has gone to the background, saving chat...');
            if (currentView === 'chat' && messages.length > 0) {
                saveCurrentChatToHistory();
            }
        }
        appState.current = nextAppState;
    };

    const generateNewClientSessionId = async () => {
        const newId = `client-session-${Date.now()}`;
        setCurrentSessionId(newId);
        setChatSession(null);
        console.log("New client session ID:", newId);
        return newId;
    };

    const handleSendMessage = async (messageTextOverride) => {
        if (!genAI) {
            showErrorToUser("Serviço de IA não inicializado. Verifique as configurações (API Key no .env) ou reinicie o app.");
            setIsLoading(false);
            return;
        }

        const currentMessageText = (typeof messageTextOverride === 'string' ? messageTextOverride : messageInput).trim();
        if (!currentMessageText && !currentFile) {
            return;
        }

        setIsLoading(true);
        setMessageInput('');

        const userMsgIdBase = `user-${Date.now()}`;
        let newMessagesPayload = [];

        if (currentFile) {
            newMessagesPayload.push({ id: `${userMsgIdBase}-file`, text: `Arquivo: ${currentFile.name}`, sender: 'user', timestamp: Date.now(), fileInfo: { name: currentFile.name, type: currentFile.mimeType } });
        }
        if (currentMessageText) {
            newMessagesPayload.push({ id: userMsgIdBase, text: currentMessageText, sender: 'user', timestamp: Date.now() });
        }
        setMessages(prev => [...prev, ...newMessagesPayload]);

        const aiMessageId = `ai-${aiMessageIdCounter}`;
        setAiMessageIdCounter(prev => prev + 1);
        const initialAiMsg = { id: aiMessageId, text: "", sender: 'ai', isStreaming: true, timestamp: Date.now() };
        setMessages(prev => [...prev, initialAiMsg]);

        try {
            const modelNameFromKey = GEMINI_MODEL_MAPPING[selectedAiModelKey] || GEMINI_MODEL_MAPPING[DEFAULT_MODEL_KEY];
            let effectiveModelName = modelNameFromKey;

            if (currentFile && (effectiveModelName !== GEMINI_MODEL_MAPPING["WalkerTECH_Pro_Max"])) {
                const fileCompatibleModel = GEMINI_MODEL_MAPPING["WalkerTECH_Pro_Max"] || "gemini-1.5-pro-latest";
                console.warn(`Arquivo anexado, trocando modelo de ${effectiveModelName} para ${fileCompatibleModel} para melhor suporte a arquivos.`);
                effectiveModelName = fileCompatibleModel;
            }
            
            const generativeModel = genAI.getGenerativeModel({
                model: effectiveModelName,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                ],
                generationConfig: { temperature: 0.7 }
            });

            let currentChat = chatSession;
            if (!currentChat) {
                const sdkChatHistory = messages
                    .filter(msg => msg.id !== aiMessageId && !msg.isError && (msg.sender === 'user' || msg.sender === 'ai') && !msg.fileInfo)
                    .map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }],
                    }));

                let systemInstructionText = `Você é ${APP_NAME_DISPLAY}, um assistente financeiro especializado em finanças e investimentos no Brasil. Responda em Português Brasileiro.`;
                if (selectedBank && selectedBank.id !== 'none') systemInstructionText += ` Contexto bancário atual: ${selectedBank.name}.`;
                if (userProfile) systemInstructionText += ` Perfil do usuário: Nome: ${userProfile.name}, Plano: ${userProfile.plan}.`;
                if (analysisPreferences) systemInstructionText += ` Preferências de Análise: Risco: ${analysisPreferences.risk}, Horizonte de Investimento: ${analysisPreferences.horizon}.`;
                if (enableDeepResearch) systemInstructionText += ` O usuário habilitou pesquisa aprofundada na web; se necessário, indique que você buscaria informações atualizadas.`;
                
                systemInstructionText += ` Se solicitado um gráfico Plotly, forneça o código HTML completo e auto-contido para o gráfico usando o CDN do Plotly.js (use https://cdn.plot.ly/plotly-latest.min.js), dentro de uma estrutura JSON como esta: {"text": "sua explicação textual...", "plotly_html": "SEU_PLOTLY_HTML_AQUI"}. O HTML do Plotly deve ser responsivo (ex: <div id='plotly-div' style='width:100%;height:100%;'></div> e Plotly.newPlot('plotly-div', data, layout, {responsive: true});). O corpo (<body>) do HTML gerado e o div do gráfico devem ter 'height: 100%' para preencher o espaço vertical disponível. Se não houver gráfico, apenas forneça a resposta textual. Certifique-se que o HTML do Plotly não contenha scripts externos além do CDN do Plotly.js e que o JSON seja válido.`;
                
                if (enableDeepResearch) systemInstructionText += ` Você pode usar a pesquisa na web para obter informações atualizadas.`;
                
                currentChat = generativeModel.startChat({
                    history: sdkChatHistory,
                    systemInstruction: { parts: [{ text: systemInstructionText }], role: "system" }
                });
                setChatSession(currentChat);
            }

            const promptParts = [];
            if (currentFile) {
                const fileBase64 = await FileSystem.readAsStringAsync(currentFile.uri, { encoding: FileSystem.EncodingType.Base64 });
                promptParts.push({ inlineData: { mimeType: currentFile.mimeType, data: fileBase64 } });
                if (!currentMessageText) {
                     promptParts.push({ text: `Analise este arquivo: ${currentFile.name}` });
                } else {
                    promptParts.push({ text: currentMessageText });
                }
            } else {
                 promptParts.push({ text: currentMessageText || "Olá" });
            }

            const result = await currentChat.sendMessageStream(promptParts);
            let accumulatedText = "";
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                accumulatedText += chunkText;
                updateAiMessageStream(aiMessageId, chunkText);
            }

            let finalReplyText = accumulatedText;
            let extractedPlotlyHtml = null;
            try {
                const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/; 
                const match = accumulatedText.match(jsonRegex);
                if (match) {
                    const jsonString = match[1] || match[2]; 
                    const parsedJson = JSON.parse(jsonString.trim());
                    if (parsedJson && typeof parsedJson.plotly_html === 'string') {
                        extractedPlotlyHtml = parsedJson.plotly_html;
                        finalReplyText = typeof parsedJson.text === 'string' ? parsedJson.text : "Aqui está o gráfico solicitado:";
                    }
                }
            } catch (e) { 
                console.warn("AI response was not valid JSON or did not contain plotly_html, using raw text:", e);
            }

            finalizeAiMessage(aiMessageId, finalReplyText, false, extractedPlotlyHtml); 
            if (currentFile) setCurrentFile(null);

        } catch (error) {
            console.error("Error sending message to Google AI:", error);
            let errorMessage = "Falha ao comunicar com a IA. Tente novamente.";
            if (error.message) errorMessage = `Erro: ${error.message}`;
            if (error.toString().includes("API key not valid")) errorMessage = "Chave de API inválida. Verifique a chave configurada no .env (EXPO_PUBLIC_GEMINI_API_KEY).";
            else if (error.toString().includes("billing account")) errorMessage = "Problema com a conta de faturamento do Google Cloud.";
            else if (error.toString().includes("quota")) errorMessage = "Cota de API excedida.";
            else if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
                 errorMessage = `Conteúdo bloqueado pela IA. Razão: ${error.response.promptFeedback.blockReason}`;
            } else if (error.response && error.response.candidates && error.response.candidates[0] && error.response.candidates[0].finishReason === "SAFETY") {
                 errorMessage = "Conteúdo bloqueado pela IA devido a políticas de segurança.";
            }
            finalizeAiMessage(aiMessageId, errorMessage, true);
        } finally {
            setIsLoading(false);
        }
    };
    
    const updateAiMessageStream = (id, chunk) => {
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === id ? { ...msg, text: (msg.text || "") + chunk, isStreaming: true } : msg
            )
        );
    };

    const finalizeAiMessage = (id, finalText, isError = false, plotlyHtml = null) => {
        setMessages(prevMessages =>
            prevMessages.map(msg => {
                if (msg.id === id) {
                    return { ...msg, text: finalText ?? (msg.text || ""), isError, isStreaming: false, plotly_html: plotlyHtml };
                }
                return msg;
            })
        );
    };

    const showView = (viewName) => {
        if (currentView === 'chat' && viewName !== 'chat' && messages.length > 0) {
            saveCurrentChatToHistory();
        }
        setCurrentView(viewName);
        setMenuModalVisible(false);
        setAppNameDropdownVisible(false);
    };

    const handleSuggestionSelect = (suggestionText) => {
        showView('chat');
        handleSendMessage(suggestionText);
    };

    const handleNewChat = async (shouldSaveCurrent = true) => {
        if (shouldSaveCurrent && messages.length > 0 && currentSessionId) {
            await saveCurrentChatToHistory();
        }
        setMessages([]);
        setMessageInput('');
        setCurrentFile(null);
        await generateNewClientSessionId(); 
        showView('chat');
    };

    const toggleTheme = () => {
        setThemeMode(prevMode => prevMode === 'dark' ? 'light' : 'dark');
    };

    const onAttachFilePress = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
                copyToCacheDirectory: true,
            });
            if (result.canceled === false && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.size && asset.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    showErrorToUser(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_MB}MB.`);
                    return;
                }
                setCurrentFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream' });
            }
        } catch (err) {
            console.warn(err);
            showErrorToUser("Erro ao selecionar arquivo.");
        }
    };
    const removeFile = () => setCurrentFile(null);

    const loadAppSettings = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('appTheme');
            if (savedTheme) setThemeMode(savedTheme); else setThemeMode('light');

            const savedModelKey = await AsyncStorage.getItem('selectedAiModelKey');
            if (savedModelKey && GEMINI_MODEL_MAPPING[savedModelKey]) setSelectedAiModelKey(savedModelKey);

            const deepResearch = await AsyncStorage.getItem('enableDeepResearch');
            if (deepResearch) setEnableDeepResearch(JSON.parse(deepResearch));

            const savedBankId = await AsyncStorage.getItem('selectedBankId');
            const bank = banksData.find(b => b.id === savedBankId);
            if (bank) setSelectedBank(bank);

        } catch (e) { console.error("Failed to load app settings", e); }
    };

    const saveAppSettings = async (closeModal = true) => {
        try {
            await AsyncStorage.setItem('appTheme', themeMode);
            await AsyncStorage.setItem('selectedAiModelKey', selectedAiModelKey);
            await AsyncStorage.setItem('enableDeepResearch', JSON.stringify(enableDeepResearch));
            await AsyncStorage.setItem('selectedBankId', selectedBank.id);
            alert("Configurações salvas!");
            if (closeModal) setAppNameDropdownVisible(false);
        } catch (e) { console.error("Failed to save app settings", e); showErrorToUser("Erro ao salvar configurações.");}
    };
    
    const loadUserProfile = async () => {
        try {
            const profileString = await AsyncStorage.getItem('userProfile');
            if (profileString) {
                setUserProfile(JSON.parse(profileString));
            }
        } catch (e) { console.error("Failed to load user profile", e); }
    };
    const saveUserProfile = async () => {
        try {
            await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
            alert("Perfil salvo!");
        } catch (e) { console.error("Failed to save user profile", e); showErrorToUser("Erro ao salvar perfil."); }
    };
    const loadAnalysisPrefs = async () => {
        try {
            const prefsString = await AsyncStorage.getItem('analysisPreferences');
            if (prefsString) {
                setAnalysisPreferences(JSON.parse(prefsString));
            }
        } catch (e) { console.error("Failed to load analysis preferences", e); }
    };
    const saveAnalysisPrefs = async () => {
        try {
            await AsyncStorage.setItem('analysisPreferences', JSON.stringify(analysisPreferences));
            alert("Preferências salvas!");
        } catch (e) { console.error("Failed to save analysis preferences", e); showErrorToUser("Erro ao salvar preferências."); }
    };

    const saveCurrentChatToHistory = async () => {
        if (messages.length > 0 && currentSessionId) {
            let historyStore = JSON.parse(await AsyncStorage.getItem('chatHistory') || '[]');
            const firstUserMessage = messages.find(m => m.sender === 'user' && m.text);
            const chatTitle = firstUserMessage ? (firstUserMessage.text.substring(0, 35) + (firstUserMessage.text.length > 35 ? '...' : '')) : `Chat de ${new Date().toLocaleTimeString()}`;

            const chatEntry = {
                id: currentSessionId,
                title: chatTitle,
                date: new Date().toISOString(),
                messages: messages.map(m => ({ ...m, isStreaming: false })), 
                selectedBankId: selectedBank.id,
                selectedAiModelKey: selectedAiModelKey,
                enableDeepResearch: enableDeepResearch,
            };

            historyStore = historyStore.filter(item => item.id !== currentSessionId); 
            historyStore.unshift(chatEntry); 
            if (historyStore.length > MAX_HISTORY_ITEMS) {
                historyStore = historyStore.slice(0, MAX_HISTORY_ITEMS);
            }
            await AsyncStorage.setItem('chatHistory', JSON.stringify(historyStore));
            setHistoryItems(historyStore); 
        }
    };
    const loadChatHistory = async () => {
        try {
            const historyStore = JSON.parse(await AsyncStorage.getItem('chatHistory') || '[]');
            setHistoryItems(historyStore);
        } catch (e) { console.error("Failed to load chat history", e); setHistoryItems([]); }
    };
    const loadChatFromHistory = async (historyItem) => {
        if (messages.length > 0 && currentSessionId !== historyItem.id) { 
            await saveCurrentChatToHistory();
        }
        setMessages(historyItem.messages || []);
        setCurrentSessionId(historyItem.id);
        setSelectedAiModelKey(historyItem.selectedAiModelKey || DEFAULT_MODEL_KEY);
        setEnableDeepResearch(historyItem.enableDeepResearch || false);
        const bank = banksData.find(b => b.id === historyItem.selectedBankId);
        setSelectedBank(bank || banksData[0]);
        setChatSession(null); 
        showView('chat');
    };
    const deleteHistoryItem = async (historyId) => {
        let historyStore = JSON.parse(await AsyncStorage.getItem('chatHistory') || '[]');
        historyStore = historyStore.filter(item => item.id !== historyId);
        await AsyncStorage.setItem('chatHistory', JSON.stringify(historyStore));
        setHistoryItems(historyStore);
        if (currentSessionId === historyId) { 
            handleNewChat(false); 
        }
    };
    const clearAllHistory = async () => {
        await AsyncStorage.removeItem('chatHistory');
        setHistoryItems([]);
        if (currentView === 'history') { 
             handleNewChat(true); 
        }
        alert("Histórico de chats apagado.");
    };

    const renderMessageItem = ({ item, index }) => {
        const isUser = item.sender === 'user';
        const markdownStyles = {
            body: { color: isUser ? colors.messageUserText : colors.messageAiText, fontSize: scaleFont(16), lineHeight: scaleFont(24), fontFamily: 'JetBrains-M' },
            heading1: { color: isUser ? colors.messageUserText : colors.messageAiText, fontWeight: 'bold', marginTop:scale(12), marginBottom:scale(6), borderBottomWidth:1, borderColor: colors.borderColor, paddingBottom: scale(6), fontFamily: 'Roboto-Bold'},
            link: { color: colors.accentSecondary, textDecorationLine: 'underline', fontFamily: 'JetBrains-M' },
            code_inline: { backgroundColor: isUser ? 'rgba(0,0,0,0.15)' : colors.bgElevation1, paddingHorizontal: scale(5), paddingVertical: scale(2), borderRadius: scale(4), fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: scaleFont(14) },
            code_block: { backgroundColor: isUser ? 'rgba(0,0,0,0.15)' : colors.bgElevation1, padding: scale(12), borderRadius: scale(6), fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', marginVertical: scale(8), fontSize: scaleFont(14) },
            table: { borderColor: colors.borderColor, borderWidth: 1, borderRadius: scale(6), marginVertical: scale(12) },
            th: { backgroundColor: colors.bgTertiary, padding: scale(8), borderBottomWidth:1, borderColor: colors.borderColor, color: colors.textPrimary, fontWeight: '600', fontFamily: 'JetBrains-Mono' },
            td: { padding: scale(8), borderBottomWidth:1, borderColor: colors.borderColor, color: colors.textPrimary, fontFamily: 'JetBrains-M' },
            list_item: { marginVertical: scale(4), flexDirection: 'row', alignItems: 'flex-start'},
            bullet_list_icon: { marginRight: scale(8), color: colors.textSecondary, fontSize: Platform.OS === 'ios' ? scaleFont(10) : scaleFont(16), lineHeight: scaleFont(24) },
            ordered_list_icon: { marginRight: scale(8), color: colors.textSecondary, fontSize: scaleFont(16), lineHeight: scaleFont(24), fontFamily: 'JetBrains-M' },
            strong: {fontFamily: 'Roboto-Bold'},
            em: {fontFamily: 'Roboto-Italic'},
        };

        const messageContainerStyle = [
            styles.messageBubbleBase,
            isUser ? styles.userMessageBubble(colors) : styles.aiMessageBubble(colors),
            item.isError ? styles.errorMessageBubble(colors) : {}
        ];

        let messageContent = item.text;
        if (item.fileInfo && !item.text) { 
            messageContent = `📎 Arquivo: ${item.fileInfo.name}`;
        } else if (item.fileInfo && item.text.startsWith(`Arquivo: ${item.fileInfo.name}`)) {
            // Text already includes file info
        }


        return (
            <Animatable.View 
                animation="fadeInUp" 
                duration={400} 
                delay={index < 5 ? index * 50 : 0} // Animate only first few messages quickly or new ones
                useNativeDriver={true}
                style={messageContainerStyle}
            >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    {!isUser && <MaterialCommunityIcons name="robot-happy-outline" size={scale(22)} color={colors.accentPrimary} style={{ marginRight: scale(8), marginTop: scale(2) }} />}
                    <View style={{ flex: 1 }}>
                        {messageContent && (
                            <Markdown style={markdownStyles}>
                                {messageContent + (item.isStreaming && !item.isError ? '▍' : '')}
                            </Markdown>
                        )}
                        {item.isError && <Text style={{color: colors.danger, marginTop: scale(5), fontStyle: 'italic', fontSize: scaleFont(13), fontFamily: 'Roboto-Italic'}}>Erro ao processar.</Text>}
                    </View>
                    {isUser && <MaterialIcons name="account-circle" size={scale(22)} color={colors.messageUserText} style={{ marginLeft: scale(8), marginTop: scale(2) }} />}
                </View>
                
                {!isUser && item.plotly_html && (
                     <View style={styles.plotlyContainer(colors)}>
                         <WebView
                             originWhitelist={['*']} 
                             source={{ html: item.plotly_html }}
                             style={{ flex:1, height: scale(300), backgroundColor: colors.plotlyBg }} 
                             javaScriptEnabled={true}
                             domStorageEnabled={true}
                             scalesPageToFit={Platform.OS === 'android'} 
                             bounces={false}
                             onShouldStartLoadWithRequest={(event) => {
                                 if (event.url.startsWith('https://cdn.plot.ly') || event.url.startsWith('data:') || event.url === 'about:blank') {
                                     return true;
                                 }
                                 if (event.url.startsWith('http')) {
                                     Linking.openURL(event.url);
                                     return false; 
                                 }
                                 return true; 
                             }}
                             onError={(syntheticEvent) => {
                                 const { nativeEvent } = syntheticEvent;
                                 console.warn('WebView error: ', nativeEvent);
                             }}
                             renderLoading={() => (
                                 <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.plotlyBg}}>
                                     <ActivityIndicator size="small" color={colors.accentPrimary} />
                                 </View>
                             )}
                             startInLoadingState={true}
                         />
                     </View>
                 )}
            </Animatable.View>
        );
    };

    const renderSuggestionCard = ({ item, index }) => (
        <Animatable.View animation="zoomIn" duration={500} delay={index * 100} useNativeDriver={true}>
            <TouchableOpacity
                style={styles.suggestionCard(colors, colors[item.borderColorThemeKey] || item.borderColorThemeKey)}
                onPress={() => handleSuggestionSelect(item.text)}
                activeOpacity={0.8}
            >
                <Text style={styles.suggestionCardText(colors)}>{item.text}</Text>
                <View style={styles.suggestionCardIconContainer(colors, colors[item.borderColorThemeKey] || item.borderColorThemeKey)}>
                    <MaterialIcons name={item.icon || "help-outline"} size={scale(18)} color={colors.bgWhite} />
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );

    const renderChatView = () => (
        <>
            {messages.length === 0 && !isLoading && (
                <ScrollView 
                    contentContainerStyle={styles.initialGreetingScrollViewContainer(colors)}
                    showsVerticalScrollIndicator={false}
                >
                    <Animatable.View 
                        animation="fadeInUp" 
                        duration={600} 
                        delay={200} 
                        useNativeDriver={true} 
                        style={styles.initialGreetingContainer(colors)}
                    >
                        <Text style={styles.greetingMainText(colors)}>
                            Olá <Text style={{color: colors.greetingHeader, fontWeight:'bold'}}>{userProfile.name || 'investidor'}</Text>
                        </Text>
                        <Text style={styles.greetingSubText(colors)}>Em que posso auxiliar hoje?</Text>
                        <View style={styles.suggestionCardsGrid}>
                            {initialSuggestions.slice(0, 4).map((item, index) => ( 
                                <View key={index} style={styles.suggestionCardWrapper}>
                                   {renderSuggestionCard({ item, index })}
                                </View>
                            ))}
                        </View>
                    </Animatable.View>
                </ScrollView>
            )}
            {messages.length > 0 && (
                <FlatList
                    ref={scrollViewRef} data={messages} renderItem={renderMessageItem}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.messagesContainer(colors)}
                    contentContainerStyle={{ paddingBottom: scale(10), paddingTop: scale(10), paddingHorizontal: scale(10) }}
                    onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                />
            )}
            {isLoading && messages.length === 0 && ( 
                 <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: colors.bgSecondary}}>
                    <ActivityIndicator size="large" color={colors.accentPrimary}/>
                    <Text style={{color: colors.textSecondary, marginTop:scale(15), fontSize: scaleFont(16), fontFamily: 'JetBrains-M'}}>
                        {genAI ? "Conectando à IA..." : "Inicializando..."}
                    </Text>
                </View>
            )}
        </>
    );
    
    const renderHistoryView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={styles.panelContainer(colors)} useNativeDriver={true}>
            <View style={styles.panelHeader(colors)}>
                <MaterialIcons name="history" size={scale(28)} color={colors.accentPrimary} />
                <Text style={styles.panelTitle(colors)}>Histórico de Chats</Text>
                {historyItems.length > 0 && (
                    <TouchableOpacity onPress={clearAllHistory} style={styles.clearHistoryButton(colors)}>
                        <MaterialIcons name="delete-sweep" size={scale(22)} color={colors.danger} />
                        <Text style={styles.clearHistoryButtonText(colors)}>Limpar Tudo</Text>
                    </TouchableOpacity>
                )}
            </View>
            {historyItems.length === 0 ? (
                <Animatable.View animation="fadeInUp" delay={200} duration={500} style={styles.emptyStateContainer(colors)} useNativeDriver={true}>
                    <MaterialCommunityIcons name="comment-remove-outline" size={scale(60)} color={colors.textPlaceholder} />
                    <Text style={styles.emptyStateText(colors)}>Nenhum chat salvo ainda.</Text>
                </Animatable.View>
            ) : (
                <FlatList
                    data={historyItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <Animatable.View animation="fadeInUp" duration={300} delay={index * 70} useNativeDriver={true}>
                            <TouchableOpacity style={styles.historyListItem(colors)} onPress={() => loadChatFromHistory(item)}>
                                <View style={{flex:1}}>
                                    <Text style={styles.historyItemTitle(colors)} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.historyItemDate(colors)}>{new Date(item.date).toLocaleString()}</Text>
                                </View>
                                <TouchableOpacity onPress={() => deleteHistoryItem(item.id)} style={{padding:scale(8)}}>
                                    <MaterialIcons name="delete-outline" size={scale(24)} color={colors.danger} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </Animatable.View>
                    )}
                    contentContainerStyle={{ paddingBottom: scale(20) }}
                />
            )}
        </Animatable.View>
    );

    const renderSettingsView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={{flex:1}} useNativeDriver={true}>
            <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
                <View style={styles.panelHeader(colors, true)}>
                    <MaterialIcons name="settings-applications" size={scale(30)} color={colors.accentPrimary} />
                    <Text style={styles.panelTitle(colors)}>Configurações Avançadas</Text>
                </View>

                <Animatable.View animation="fadeInUp" delay={100} duration={400} style={styles.settingGroup(colors)} useNativeDriver={true}>
                    <Text style={styles.settingGroupTitle(colors)}>Pesquisa e Análise</Text>
                    <View style={styles.settingItem(colors)}>
                        <MaterialIcons name="travel-explore" size={scale(24)} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                        <Text style={styles.settingLabel(colors)}>Pesquisa Web (Contexto):</Text>
                        <TouchableOpacity
                            style={[styles.checkboxBase(colors), enableDeepResearch && styles.checkboxChecked(colors)]}
                            onPress={() => setEnableDeepResearch(!enableDeepResearch)}
                        >
                            {enableDeepResearch && <MaterialIcons name="check" size={scale(18)} color={colors.buttonText} />}
                        </TouchableOpacity>
                    </View>
                </Animatable.View>

                <Animatable.View animation="fadeInUp" delay={200} duration={400} useNativeDriver={true}>
                    <TouchableOpacity style={styles.actionButton(colors)} onPress={() => saveAppSettings(false)}>
                        <MaterialIcons name="save" size={scale(20)} color={colors.buttonText} style={{marginRight: scale(10)}}/>
                        <Text style={styles.actionButtonText(colors)}>Salvar Config. Pesquisa</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </Animatable.View>
    );

    const renderProfileView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={{flex:1}} useNativeDriver={true}>
            <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
                 <View style={styles.panelHeader(colors, true)}>
                    <MaterialIcons name="person-outline" size={scale(30)} color={colors.accentPrimary} />
                    <Text style={styles.panelTitle(colors)}>Meu Perfil</Text>
                </View>
                <Animatable.View animation="fadeInUp" delay={100} duration={400} useNativeDriver={true}>
                    <View style={styles.settingItem(colors)}>
                        <Text style={styles.settingLabel(colors)}>Nome:</Text>
                        <TextInput value={userProfile.name} onChangeText={text => setUserProfile(p => ({...p, name: text}))} style={styles.profileTextInput(colors)} placeholder="Seu nome" placeholderTextColor={colors.textPlaceholder}/>
                    </View>
                </Animatable.View>
                <Animatable.View animation="fadeInUp" delay={150} duration={400} useNativeDriver={true}>
                    <View style={styles.settingItem(colors)}>
                        <Text style={styles.settingLabel(colors)}>Email:</Text>
                        <TextInput value={userProfile.email} onChangeText={text => setUserProfile(p => ({...p, email: text}))} style={styles.profileTextInput(colors)} placeholder="seu@email.com" keyboardType="email-address" placeholderTextColor={colors.textPlaceholder}/>
                    </View>
                </Animatable.View>
                <Animatable.View animation="fadeInUp" delay={200} duration={400} useNativeDriver={true}>
                    <View style={styles.settingItem(colors)}>
                        <Text style={styles.settingLabel(colors)}>Plano:</Text>
                        <Text style={[styles.profileTextInput(colors), {textAlign:'right'}]}>{userProfile.plan}</Text>
                    </View>
                </Animatable.View>
                <Animatable.View animation="fadeInUp" delay={250} duration={400} useNativeDriver={true}>
                    <TouchableOpacity style={styles.actionButton(colors)} onPress={saveUserProfile}>
                        <MaterialIcons name="save" size={scale(20)} color={colors.buttonText} style={{marginRight: scale(10)}}/>
                        <Text style={styles.actionButtonText(colors)}>Salvar Perfil</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </Animatable.View>
    );

    const renderPreferencesView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={{flex:1}} useNativeDriver={true}>
             <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
                <View style={styles.panelHeader(colors, true)}>
                    <MaterialCommunityIcons name="tune-variant" size={scale(30)} color={colors.accentPrimary} />
                    <Text style={styles.panelTitle(colors)}>Preferências de Análise</Text>
                </View>
                <Animatable.View animation="fadeInUp" delay={100} duration={400} useNativeDriver={true}>
                    <View style={styles.settingItem(colors)}>
                        <Text style={styles.settingLabel(colors)}>Nível de Risco:</Text>
                         <View style={styles.pickerContainerPrefs(colors)}>
                            <Picker selectedValue={analysisPreferences.risk} onValueChange={val => setAnalysisPreferences(p => ({...p, risk: val}))} style={styles.pickerStyle(colors)} dropdownIconColor={colors.textPrimary}>
                                <Picker.Item label="Conservador" value="conservative" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                                <Picker.Item label="Moderado" value="moderate" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                                <Picker.Item label="Agressivo" value="aggressive" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                            </Picker>
                        </View>
                    </View>
                </Animatable.View>
                <Animatable.View animation="fadeInUp" delay={150} duration={400} useNativeDriver={true}>
                    <View style={styles.settingItem(colors)}>
                        <Text style={styles.settingLabel(colors)}>Horizonte:</Text>
                        <View style={styles.pickerContainerPrefs(colors)}>
                            <Picker selectedValue={analysisPreferences.horizon} onValueChange={val => setAnalysisPreferences(p => ({...p, horizon: val}))} style={styles.pickerStyle(colors)} dropdownIconColor={colors.textPrimary}>
                                <Picker.Item label="Curto Prazo" value="short" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                                <Picker.Item label="Médio Prazo" value="medium" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                                <Picker.Item label="Longo Prazo" value="long" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                            </Picker>
                        </View>
                    </View>
                </Animatable.View>
                <Animatable.View animation="fadeInUp" delay={200} duration={400} useNativeDriver={true}>
                    <TouchableOpacity style={styles.actionButton(colors)} onPress={saveAnalysisPrefs}>
                        <MaterialIcons name="save" size={scale(20)} color={colors.buttonText} style={{marginRight: scale(10)}}/>
                        <Text style={styles.actionButtonText(colors)}>Salvar Preferências</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </Animatable.View>
    );

    const renderSidebar = () => (
        <LinearGradient colors={colors.sidebarGradient} style={styles.sidebar(colors)} start={{x:0.5, y:0}} end={{x:0.5, y:1}}>
            {[
                { icon: "menu", size: scale(30), action: () => setMenuModalVisible(true) },
                { icon: "add", size: scale(32), action: () => handleNewChat() },
                { isSpacer: true },
                { icon: "history", size: scale(28), action: () => showView('history') },
                { icon: "settings", size: scale(26), action: () => showView('settings') },
            ].map((item, index) => {
                if (item.isSpacer) return <View key={`spacer-${index}`} style={{flex:1}} />;
                return (
                    <Animatable.View 
                        key={item.icon + index} 
                        ref={ref => sidebarIconsRef.current[index] = ref}
                        style={{opacity: 0, transform: [{translateY: 20}]}} // Initial state for animation
                    >
                        <TouchableOpacity style={styles.sidebarIconWrapper(colors)} onPress={item.action}>
                            <MaterialIcons name={item.icon} size={item.size} color={colors.bgWhite} />
                        </TouchableOpacity>
                    </Animatable.View>
                );
            })}
        </LinearGradient>
    );

    const renderTopBar = () => (
        <View style={styles.topBar(colors)}>
            <TouchableOpacity style={styles.appNameTouchable(colors)} onPress={() => setAppNameDropdownVisible(true)} activeOpacity={0.7}>
                <View>
                    <Text style={styles.appNameText(colors)}>{APP_NAME_DISPLAY}</Text>
                    <View style={styles.appNameUnderline(colors)} />
                </View>
                <MaterialIcons name="arrow-drop-down" size={scale(28)} color={colors.textPrimary} style={{marginLeft: scale(5)}} />
            </TouchableOpacity>
        </View>
    );

    const renderInputArea = () => (
        <Animatable.View animation="slideInUp" duration={300} delay={100} style={styles.inputAreaContainer(colors)} useNativeDriver={true}>
             {currentFile && (
                <Animatable.View animation="fadeInDown" duration={300} style={styles.filePreviewContainer(colors)} useNativeDriver={true}>
                    <MaterialIcons name={currentFile.mimeType?.startsWith("image/") ? "image" : "insert-drive-file"} size={scale(20)} color={colors.accentPrimary} />
                    <Text style={styles.fileNamePreview(colors)} numberOfLines={1}>{currentFile.name}</Text>
                    <TouchableOpacity onPress={removeFile} style={{padding:scale(3)}}><MaterialIcons name="close" size={scale(20)} color={colors.danger} /></TouchableOpacity>
                </Animatable.View>
            )}
            <LinearGradient colors={colors.inputBorderGradient} start={{x:0, y:0.5}} end={{x:1,y:0.5}} style={styles.inputWrapperGradient(colors)}>
                <View style={styles.inputWrapper(colors)}>
                    <TouchableOpacity onPress={onAttachFilePress} style={styles.inputIconButton(colors)} disabled={isLoading}>
                        <MaterialIcons name="attach-file" size={scale(26)} color={isLoading ? colors.textPlaceholder : colors.accentPrimary} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput(colors)}
                        value={messageInput}
                        onChangeText={setMessageInput}
                        placeholder="Digite o que voce deseja"
                        placeholderTextColor={colors.textPlaceholder}
                        multiline
                        editable={!isLoading}
                        textAlignVertical="top" 
                    />
                    <TouchableOpacity
                        onPress={() => handleSendMessage()}
                        style={[styles.inputIconButton(colors), styles.sendButton(colors), (isLoading || (!messageInput.trim() && !currentFile)) && styles.sendButtonDisabled(colors)]}
                        disabled={isLoading || (!messageInput.trim() && !currentFile)}>
                        {isLoading && messages.some(m => m.isStreaming && m.sender === 'ai') ?
                            <ActivityIndicator size="small" color={colors.buttonText} /> :
                            <MaterialIcons name="send" size={scale(24)} color={colors.buttonText} />}
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </Animatable.View>
    );

    const renderFooter = () => (
        <View style={styles.footerContainer(colors)}>
            <Text style={styles.footerText(colors)}>WalkerTECH LLC DO BRASIL © TODOS OS DIREITOS RESERVADOS</Text>
        </View>
    );

    const renderHamburgerMenuModal = () => (
        <Modal
            animationType="fade" transparent={true} visible={menuModalVisible}
            onRequestClose={() => setMenuModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setMenuModalVisible(false)}>
                <Animatable.View 
                    animation="slideInLeft" // Changed animation
                    duration={400} 
                    style={[styles.menuModalBase(colors), styles.hamburgerMenuModalPos(colors)]} 
                    onStartShouldSetResponder={() => true}
                    useNativeDriver={true}
                >
                    <View style={styles.menuHeader(colors)}>
                        <MaterialIcons name="assessment" size={scale(28)} color={colors.accentPrimary} style={styles.menuAppIcon} />
                        <Text style={styles.menuTitle(colors)}>{APP_NAME_DISPLAY}</Text>
                    </View>
                    <TouchableOpacity style={styles.menuItem(colors, currentView === 'profile')} onPress={() => { showView('profile'); }}>
                        <MaterialIcons name="account-circle" size={scale(24)} color={currentView === 'profile' ? colors.accentPrimary : colors.textPrimary} />
                        <Text style={styles.menuItemText(colors, currentView === 'profile')}>Meu Perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem(colors, currentView === 'preferences')} onPress={() => { showView('preferences'); }}>
                        <MaterialCommunityIcons name="tune-variant" size={scale(24)} color={currentView === 'preferences' ? colors.accentPrimary : colors.textPrimary} />
                        <Text style={styles.menuItemText(colors, currentView === 'preferences')}>Preferências de Análise</Text>
                    </TouchableOpacity>
                    <View style={{flex:1}} />
                    <TouchableOpacity style={[styles.menuItem(colors), {borderTopWidth: 1, borderTopColor: colors.dividerColor}]} onPress={async () => {
                        setMenuModalVisible(false);
                        await AsyncStorage.multiRemove(['appTheme', 'selectedAiModelKey', 'enableDeepResearch', 'selectedBankId', 'userProfile', 'analysisPreferences', 'chatHistory']);
                        alert('Sessão local e dados limpos. Recarregue o aplicativo para aplicar todas as mudanças.');
                        setMessages([]); setCurrentFile(null);
                        setUserProfile({ name: 'Investidor', email: 'investidor.pro@email.com', plan: 'pro' });
                        setAnalysisPreferences({ risk: 'moderate', horizon: 'medium' });
                        setHistoryItems([]); setSelectedBank(banksData[0]);
                        setSelectedAiModelKey(DEFAULT_MODEL_KEY); setEnableDeepResearch(false);
                        setThemeMode('light'); 
                        setCurrentSessionId(null); setChatSession(null);
                        await generateNewClientSessionId();
                        showView('chat');
                    }}>
                        <MaterialIcons name="logout" size={scale(24)} color={colors.danger} />
                        <Text style={[styles.menuItemText(colors), {color: colors.danger}]}>Sair (Limpar Tudo)</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </TouchableOpacity>
        </Modal>
    );

    const renderAppNameDropdownModal = () => (
        <Modal
            animationType="fade" transparent={true} visible={appNameDropdownVisible}
            onRequestClose={() => setAppNameDropdownVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setAppNameDropdownVisible(false)}>
                <Animatable.View 
                    animation="fadeInDown" // Changed animation
                    duration={300} 
                    style={[styles.menuModalBase(colors), styles.appNameDropdownModalPos(colors)]} 
                    onStartShouldSetResponder={() => true}
                    useNativeDriver={true}
                >
                    <Text style={styles.modalTitle(colors)}>Opções Rápidas</Text>

                    <View style={styles.settingItemModal(colors)}>
                        <MaterialIcons name={themeMode === 'dark' ? "brightness-7" : "brightness-4"} size={scale(24)} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                        <Text style={styles.settingLabel(colors)}>Tema:</Text>
                        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleButton(colors)}>
                            <Text style={styles.themeToggleButtonText(colors)}>Mudar para {themeMode === 'dark' ? 'Claro' : 'Escuro'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.settingItemModal(colors)}>
                        <MaterialCommunityIcons name="bank" size={scale(24)} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                        <Text style={styles.settingLabel(colors)}>Banco:</Text>
                        <TouchableOpacity onPress={() => {setBankModalVisible(true); setAppNameDropdownVisible(false);}} style={styles.themeToggleButton(colors)}>
                             <Text style={styles.themeToggleButtonText(colors)} numberOfLines={1} ellipsizeMode="tail">
                                {selectedBank.name === 'Nenhum Banco' ? 'Selecionar' : selectedBank.name}
                             </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.settingItemModal(colors)}>
                        <MaterialCommunityIcons name="brain" size={scale(24)} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                        <Text style={styles.settingLabel(colors)}>Modelo IA:</Text>
                        <View style={styles.pickerContainerDropdown(colors)}>
                            <Picker
                                selectedValue={selectedAiModelKey}
                                onValueChange={(itemValue) => setSelectedAiModelKey(itemValue)}
                                style={styles.pickerStyle(colors)} // Ensure pickerStyle scales font if needed
                                itemStyle={styles.pickerItemStyle(colors)} // For iOS item text color
                                dropdownIconColor={colors.textPrimary}
                                mode="dropdown"
                            >
                                {Object.entries(GEMINI_MODEL_MAPPING).map(([key, modelId]) => (
                                    <Picker.Item
                                        key={key}
                                        label={AI_MODELS_DISPLAY[modelId] || key}
                                        value={key}
                                        color={Platform.OS === 'android' ? colors.textPrimary : undefined} // Android direct color
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>
                    <TouchableOpacity style={[styles.actionButton(colors), {marginTop:scale(25)}]} onPress={() => saveAppSettings(true)}>
                        <MaterialIcons name="check-circle-outline" size={scale(20)} color={colors.buttonText} style={{marginRight: scale(10)}}/>
                        <Text style={styles.actionButtonText(colors)}>Confirmar Opções</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </TouchableOpacity>
        </Modal>
    );

    const renderBankSelectionModal = () => (
        <Modal
            animationType="slide" transparent={true} visible={bankModalVisible} // Default slide is good
            onRequestClose={() => setBankModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setBankModalVisible(false)}>
                 {/* Animatable.View can wrap the content if more custom animation is needed than Modal's animationType */}
                <Animatable.View 
                    animation="fadeInUpBig" 
                    duration={400} 
                    style={[styles.menuModalBase(colors), styles.bankSelectionModalContent(colors)]} 
                    onStartShouldSetResponder={() => true}
                    useNativeDriver={true} // If animation allows
                >
                    <Text style={styles.modalTitle(colors)}>Selecione um Banco</Text>
                    <FlatList
                        data={banksData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, index }) => (
                            <Animatable.View animation="fadeInUp" duration={300} delay={index * 50} useNativeDriver={true}>
                                <TouchableOpacity
                                    style={styles.bankListItem(colors, selectedBank.id === item.id)}
                                    onPress={() => {
                                        setSelectedBank(item);
                                        setBankModalVisible(false);
                                    }}
                                >
                                    <Image source={{ uri: item.logoUrl }} style={styles.bankLogo(colors)} resizeMode="contain" />
                                    <Text style={styles.bankName(colors, selectedBank.id === item.id)}>{item.name}</Text>
                                    {selectedBank.id === item.id && <MaterialIcons name="check-circle" size={scale(24)} color={colors.success} />}
                                </TouchableOpacity>
                            </Animatable.View>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.bankListSeparator(colors)} />}
                        contentContainerStyle={{paddingBottom: scale(10)}}
                    />
                     <TouchableOpacity style={[styles.actionButton(colors), {marginTop:scale(15)}]} onPress={() => setBankModalVisible(false)}>
                        <Text style={styles.actionButtonText(colors)}>Fechar</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} 
        >
            <View style={styles.appContainer(colors)}>
                <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bgPrimary} />
                <View style={styles.mainRowContainer(colors)}>
                    {renderSidebar()}
                    <View style={styles.mainContentColumn(colors)}>
                        {renderTopBar()}
                        <View style={styles.chatOrViewArea(colors)}>
                            {/* Key prop triggers re-animation on view change */}
                            <Animatable.View key={currentView} animation="fadeIn" duration={300} style={{flex:1}} useNativeDriver={true}>
                                {currentView === 'chat' && renderChatView()}
                                {currentView === 'history' && renderHistoryView()}
                                {currentView === 'settings' && renderSettingsView()}
                                {currentView === 'profile' && renderProfileView()}
                                {currentView === 'preferences' && renderPreferencesView()}
                            </Animatable.View>
                        </View>
                        {currentView === 'chat' && renderInputArea()}
                        {currentView === 'chat' && renderFooter()}
                    </View>
                </View>
                
                {renderHamburgerMenuModal()}
                {renderAppNameDropdownModal()}
                {renderBankSelectionModal()}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    // Apply scale() to relevant numeric values (fontSizes, paddings, margins, widths, heights)
    appContainer: (colors) => ({ flex: 1, backgroundColor: colors.bgPage }),
    mainRowContainer: () => ({ flex: 1, flexDirection: 'row' }),
    sidebar: (colors) => ({
        width: SIDEBAR_WIDTH, // Already scaled
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + scale(20) : scale(55),
        paddingBottom: scale(20),
        alignItems: 'center',
    }),
    sidebarIconWrapper: (colors) => ({
        paddingVertical: scale(18), // Reduced padding for more icons if needed
        width: '100%',
        alignItems: 'center',
    }),
    mainContentColumn: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary }),
    topBar: (colors) => ({
        flexDirection: 'row',
        justifyContent: 'flex-start', 
        alignItems: 'center',
        paddingHorizontal: scale(20), 
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + scale(15) : scale(50),
        paddingBottom: scale(15),
        backgroundColor: colors.bgPrimary,
        minHeight: scale(70), 
    }),
    appNameTouchable: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(4),
    }),
    appNameText: (colors) => ({
        fontSize: scaleFont(18), 
        fontWeight: '600', 
        color: colors.textPrimary,
        fontFamily: 'JetBrains-Mono', 
    }),
    appNameUnderline: (colors) => ({
        height: scale(2.5),
        backgroundColor: colors.appNameUnderline, 
        marginTop: scale(2),
        borderRadius: scale(2),
    }),
    chatOrViewArea: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary }),

    messagesContainer: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary }),
    messageBubbleBase: {
        maxWidth: '85%',
        paddingVertical: scale(12), 
        paddingHorizontal: scale(16),
        borderRadius: scale(20), 
        marginVertical: scale(6), 
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, 
        shadowRadius: scale(4),
        elevation: 2,
    },
    userMessageBubble: (colors) => ({
        backgroundColor: colors.messageUserBg,
        alignSelf: 'flex-end',
        marginRight:scale(10),
        borderBottomRightRadius: scale(8) 
    }),
    aiMessageBubble: (colors) => ({
        backgroundColor: colors.messageAiBg,
        alignSelf: 'flex-start',
        marginLeft:scale(10),
        borderBottomLeftRadius: scale(8)
    }),
    errorMessageBubble: (colors) => ({
        backgroundColor: colors.danger + '20', 
        borderColor: colors.danger,
        borderWidth:1
    }),
    plotlyContainer: (colors) => ({
        marginTop: scale(12),
        height: scale(300), 
        width: '100%', 
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: scale(12), 
        overflow: 'hidden', 
        backgroundColor: colors.plotlyBg 
    }),

    initialGreetingScrollViewContainer: (colors) => ({
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center', 
        backgroundColor: colors.bgSecondary,
        paddingBottom: scale(30), 
    }),
    initialGreetingContainer: () => ({
        alignItems: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: scale(20), 
        width: '100%', 
    }),
    greetingMainText: (colors) => ({
        fontSize: scaleFont(screenWidth > 400 ? 42 : 36), 
        fontWeight: '300', 
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: scale(8), 
        fontFamily: 'Roboto-Light',
        lineHeight: scaleFont(screenWidth > 400 ? 50 : 44),
    }),
    greetingSubText: (colors) => ({
        fontSize: scaleFont(screenWidth > 400 ? 20 : 18), 
        fontWeight: '400',
        color: colors.textSecondary,
        marginTop: 0,
        marginBottom: scale(30), 
        textAlign: 'center',
        fontFamily: 'JetBrains-M',
    }),
    suggestionCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around', 
        width: '100%',
        paddingHorizontal: scale(5), 
    },
    suggestionCardWrapper: {
        width: screenWidth > 700 ? '48%' : '100%', // Keep responsive for tablet vs mobile
        marginBottom: scale(15), 
        paddingHorizontal: screenWidth > 700 ? scale(5) : 0, 
    },
    suggestionCard: (colors, borderColor) => ({
        backgroundColor: colors.bgCard,
        borderRadius: scale(16), 
        padding: scale(20), 
        borderWidth: scale(2), 
        borderColor: borderColor,
        flexDirection: 'column', 
        alignItems: 'flex-start', 
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: scale(5),
        elevation: 4,
        minHeight: scale(120), 
        justifyContent: 'space-between', 
    }),
    suggestionCardText: (colors) => ({
        fontSize: scaleFont(15), // Slightly smaller for suggestions
        fontWeight: '500', 
        color: colors.textPrimary, 
        fontFamily: 'JetBrains-Mono',
        lineHeight: scaleFont(20), // Adjusted line height
        marginBottom: scale(10), 
    }),
    suggestionCardIconContainer: (colors, iconBgColor) => ({
        padding: scale(8),
        borderRadius: scale(20), 
        backgroundColor: iconBgColor, 
        alignSelf: 'flex-end', 
    }),

    inputAreaContainer: (colors) => ({
        paddingHorizontal: scale(15), 
        paddingTop: scale(10),
        paddingBottom: Platform.OS === 'ios' ? scale(25) : scale(10), 
        backgroundColor: colors.bgInputArea,
    }),
    filePreviewContainer: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal:scale(12),
        paddingVertical:scale(8),
        backgroundColor:colors.bgTertiary,
        borderRadius:scale(20),
        marginBottom:scale(10), 
        borderWidth:1,
        borderColor:colors.borderColor
    }),
    fileNamePreview: (colors) => ({
        flex:1,
        marginLeft:scale(10),
        marginRight:scale(8),
        color:colors.textSecondary,
        fontSize:scaleFont(14),
        fontFamily: 'JetBrains-M'
    }),
    inputWrapperGradient: (colors) => ({
        borderRadius: scale(30), 
        padding: scale(2), 
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: scale(4),
        elevation: 3,
    }),
    inputWrapper: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center', 
        backgroundColor: colors.inputBg,
        borderRadius: scale(28), 
        paddingHorizontal: scale(8), 
        minHeight: scale(58), 
    }),
    textInput: (colors) => ({
        flex: 1,
        color: colors.textPrimary,
        fontSize: scaleFont(16),
        paddingHorizontal: scale(15), 
        paddingTop: Platform.OS === 'ios' ? scale(16) : scale(12), 
        paddingBottom: Platform.OS === 'ios' ? scale(16) : scale(12),
        maxHeight: scale(120),
        fontFamily: 'JetBrains-M',
    }),
    inputIconButton: () => ({
        padding: scale(10), 
        justifyContent: 'center',
        alignItems: 'center',
    }),
    sendButton: (colors) => ({
        backgroundColor: colors.accentPrimary,
        borderRadius: scale(22), 
        width: scale(44), height: scale(44), 
        margin: scale(4),
    }),
    sendButtonDisabled: (colors) => ({ backgroundColor: colors.textPlaceholder }),

    footerContainer: (colors) => ({
        paddingVertical: scale(12), 
        paddingHorizontal: scale(15),
        backgroundColor: colors.bgPrimary, 
        alignItems: 'center',
    }),
    footerText: (colors) => ({
        fontSize: scaleFont(11), 
        color: colors.textSecondary,
        textAlign: 'center',
        fontFamily: 'JetBrains-M',
        letterSpacing: 0.2,
    }),

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent:'center', alignItems:'center' }, // Darker overlay
    menuModalBase: (colors) => ({
        backgroundColor: colors.menuBg, 
        borderRadius: scale(16), 
        paddingBottom: scale(10), 
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25,
        shadowRadius: scale(10),
        elevation: 12,
        overflow: 'hidden', // Important for animations and border radius
    }),
    hamburgerMenuModalPos: (colors) => ({ // Hamburger specific positioning
        position: 'absolute',
        left: 0,
        top: 0, bottom: 0,
        width: Math.min(screenWidth * 0.8, scale(300)), 
        minWidth: scale(280),
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + scale(15) : scale(45),
    }),
    appNameDropdownModalPos: (colors) => ({ // App Name Dropdown specific positioning
        position: 'absolute',
        top: Platform.OS === 'android' ? StatusBar.currentHeight + scale(60) : scale(90), 
        left: SIDEBAR_WIDTH + scale(10),
        width: screenWidth - SIDEBAR_WIDTH - scale(30), 
        maxWidth: scale(380), 
        paddingTop: scale(20), 
    }),
    bankSelectionModalContent: (colors) => ({ // Bank Selection specific content styling
        marginHorizontal: scale(20),
        maxHeight: screenHeight * 0.75, 
        width: screenWidth * (IS_SMALL_SCREEN ? 0.95 : 0.9), // Wider on small screens
        maxWidth: scale(480), 
        paddingTop: scale(20),
    }),
    menuHeader: (colors) => ({ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: scale(20), 
        paddingVertical: scale(15), 
        marginBottom: scale(15), 
        borderBottomWidth:1, 
        borderBottomColor: colors.dividerColor, 
    }),
    menuAppIcon: { marginRight: scale(15) }, 
    menuTitle: (colors) => ({ fontSize: scaleFont(20), fontWeight: '600', color: colors.textPrimary, flexShrink:1, fontFamily: 'JetBrains-Mono' }),
    menuItem: (colors, isActive = false) => ({
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: scale(15), paddingHorizontal: scale(20), 
        backgroundColor: isActive ? colors.accentPrimary + '2A' : 'transparent', 
        borderRadius: isActive ? scale(12) : 0, 
        marginHorizontal: isActive ? scale(10) : 0, 
        marginBottom: scale(5), 
    }),
    menuItemText: (colors, isActive = false) => ({
        fontSize: scaleFont(15), 
        color: isActive ? colors.accentPrimary : colors.textPrimary,
        marginLeft: scale(20), 
        fontWeight: isActive ? '600' : '400',
        fontFamily: isActive ? 'JetBrains-Mono' : 'JetBrains-M',
    }),
    modalTitle: (colors) => ({ fontSize: scaleFont(22), fontWeight: '600', color: colors.textPrimary, marginBottom: scale(25), textAlign: 'center', paddingHorizontal:scale(15), fontFamily: 'JetBrains-Mono' }),

    settingItem: (colors) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scale(18), paddingHorizontal:scale(20), borderBottomWidth: 1, borderBottomColor: colors.dividerColor }),
    settingItemModal: (colors) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scale(15), paddingHorizontal:scale(20), borderBottomWidth: 1, borderBottomColor: colors.dividerColor + '99', width: '100%' }),
    settingIcon: () => ({ marginRight: scale(18) }),
    settingLabel: (colors) => ({ fontSize: scaleFont(16), color: colors.textPrimary, flex: 1, fontFamily: 'JetBrains-M' }),
    themeToggleButton: (colors) => ({ paddingVertical: scale(10), paddingHorizontal: scale(15), backgroundColor: colors.accentPrimary, borderRadius: scale(25), minWidth: scale(120), alignItems:'center' }),
    themeToggleButtonText: (colors) => ({ color: colors.buttonText, fontSize: scaleFont(14), fontWeight: '500', fontFamily: 'JetBrains-Mono' }),

    pickerContainerDropdown: (colors) => ({ borderWidth: 1, borderColor: colors.borderColor, borderRadius: scale(12), backgroundColor: colors.inputBg, justifyContent: 'center', minWidth: scale(160), maxWidth: screenWidth * (IS_SMALL_SCREEN ? 0.4 : 0.45), marginLeft: scale(10)}),
    pickerContainerPrefs: (colors) => ({ borderWidth: 1, borderColor: colors.borderColor, borderRadius: scale(12), backgroundColor: colors.inputBg, justifyContent: 'center', flex: 1, marginLeft: scale(12)}),
    pickerStyle: (colors) => ({ height: scale(52), color: colors.textPrimary, width:'100%', fontSize: scaleFont(15) }), // Added fontSize
    pickerItemStyle: (colors) => ({ color: colors.textPrimary, fontSize: scaleFont(16) }), // For iOS items

    checkboxBase: (colors) => ({ width: scale(28), height: scale(28), justifyContent: 'center', alignItems: 'center', borderRadius: scale(8), borderWidth: 2, borderColor: colors.accentPrimary, backgroundColor: colors.inputBg, marginLeft: scale(12) }),
    checkboxChecked: (colors) => ({ backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }),
    actionButton: (colors) => ({ backgroundColor: colors.accentPrimary, paddingVertical: scale(16), paddingHorizontal: scale(35), borderRadius: scale(100), alignSelf: 'center', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop:scale(35), shadowColor: colors.shadowColor, shadowOffset:{width:0, height:3}, shadowOpacity:0.25, shadowRadius:scale(4), elevation:4 }),
    actionButtonText: (colors) => ({ color: colors.buttonText, fontSize: scaleFont(15), fontWeight: '500', fontFamily: 'JetBrains-Mono', letterSpacing: 0.1 }),

    panelContainer: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary, padding:scale(20) }),
    panelScrollView: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary }),
    panelContent: () => ({ paddingHorizontal: 0, paddingVertical: scale(10), paddingBottom: scale(40) }), 
    panelHeader: (colors, centered = false) => ({ flexDirection: 'row', alignItems: 'center', marginBottom: scale(25), paddingBottom:scale(15), borderBottomWidth:1, borderBottomColor: colors.dividerColor, justifyContent: centered ? 'center' : 'flex-start' }),
    panelTitle: (colors) => ({ fontSize: scaleFont(24), fontWeight: '600', color: colors.textPrimary, marginLeft: scale(12), flex:1, fontFamily: 'JetBrains-Mono' }),

    historyListItem: (colors) => ({ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, paddingVertical:scale(15), paddingHorizontal:scale(18), borderRadius:scale(12), marginBottom:scale(12), shadowColor: colors.shadowColor, shadowOffset:{width:0,height:2}, shadowOpacity:0.08, shadowRadius:scale(3), elevation:2 }),
    historyItemTitle: (colors) => ({ fontSize:scaleFont(16), fontWeight:'500', color:colors.textPrimary, marginBottom:scale(4), fontFamily: 'JetBrains-Mono' }),
    historyItemDate: (colors) => ({ fontSize:scaleFont(12), color:colors.textSecondary, fontFamily: 'JetBrains-M' }),
    clearHistoryButton: (colors) => ({ flexDirection:'row', alignItems:'center', paddingVertical:scale(6), paddingHorizontal:scale(12), borderRadius:scale(20), backgroundColor: colors.danger + '20'}),
    clearHistoryButtonText: (colors) => ({ color: colors.danger, fontSize:scaleFont(13), marginLeft:scale(6), fontWeight:'500', fontFamily: 'JetBrains-Mono'}),
    emptyStateContainer: () => ({ flex:1, justifyContent:'center', alignItems:'center', padding:scale(20) }),
    emptyStateText: (colors) => ({ fontSize:scaleFont(17), color:colors.textPlaceholder, marginTop:scale(15), textAlign:'center', fontFamily: 'JetBrains-M' }),

    settingGroup: (colors) => ({ marginBottom: scale(30), backgroundColor: colors.bgCard, borderRadius:scale(12), paddingVertical:scale(10), shadowColor: colors.shadowColor, shadowOffset:{width:0,height:2}, shadowOpacity:0.08, shadowRadius:scale(3), elevation:2}),
    settingGroupTitle: (colors) => ({ fontSize:scaleFont(14), fontWeight:'700', color:colors.textSecondary, paddingHorizontal:scale(20), paddingTop:scale(15), paddingBottom:scale(8), textTransform:'uppercase', letterSpacing:0.2, fontFamily: 'ProductSans-Bold' }), 
    profileTextInput: (colors) => ({ flex:1, color: colors.textPrimary, fontSize: scaleFont(16), paddingVertical:scale(10), textAlign:'right', fontFamily: 'JetBrains-M'}),

    bankListItem: (colors, isSelected) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(15), 
        paddingHorizontal: scale(18),
        borderRadius: scale(12), 
        backgroundColor: isSelected ? colors.accentPrimary + '2A' : colors.bgTertiary,
        marginBottom: scale(10), 
    }),
    bankLogo: (colors) => ({ width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: scale(18), backgroundColor: colors.bgWhite }), // Use theme color for bg
    bankName: (colors, isSelected) => ({
        flex: 1,
        fontSize: scaleFont(16),
        color: isSelected ? colors.accentPrimary : colors.textPrimary,
        fontWeight: isSelected ? '600' : '400',
        fontFamily: isSelected ? 'JetBrains-Mono' : 'JetBrains-M',
    }),
    bankListSeparator: (colors) => ({ height: 1, backgroundColor: colors.dividerColor, marginVertical: scale(4) }),
}); 