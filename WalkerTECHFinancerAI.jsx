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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const APP_NAME_DISPLAY = "WalkerTECH-AI-Financer";
const SIDEBAR_WIDTH = 70;

// --- THEME DEFINITIONS ---
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
        plotlyBg: '#1E1E1E', sidebarGradient: ['#333333', '#222222', '#111111'],
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
        plotlyBg: '#FFFFFF', sidebarGradient: ['#FF416C', '#FFDEB4'],
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
    { text: "Crie uma tabela comparativa com os valores da Tabela FIPE atualizada de carros das marcas Fiat, Volkswagen, Chevrolet e Renault, incluindo modelos populares (como Fiat Mobi, VW Gol, Chevrolet Onix, Renault Kwid) até os top de linha (como Fiat Fastback, VW Taos, Chevrolet Trailblazer, Renault Koleos), separados por categoria e ano de fabricação (ex: 2020 a 2024). Exiba preço médio, variação mensal e categoria.", borderColorThemeKey: "warning", icon: "directions-car" },
];

const AI_MODELS_DISPLAY = {
    "gemini-2.5-pro-preview-05-06": "Gemini 2.5 Pro (Preview)",
    "gemini-2.0-flash": "Gemini 2.0 Flash",
    "gemini-1.5-flash": "Gemini 1.5 Flash",
};
const GEMINI_MODEL_MAPPING = {
    "WalkerTECH_Pro_Max": "gemini-2.5-pro-preview-05-06",
    "WalkerTECH_1.5_Flash": "gemini-2.0-flash",
    "WalkerTECH_Compact": "gemini-1.5-flash",
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

    useEffect(() => {
        initializeApp();
        const subscription = AppState.addEventListener('change', handleAppStateChange);
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
            // Acessa a API Key do Gemini a partir das variáveis de ambiente
            // injetadas pelo Expo CLI (definidas no arquivo .env).
            // A variável deve ser referenciada estaticamente como process.env.NOME_DA_VARIAVEL.
            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || apiKey.length < 10) { // Adicionada verificação de comprimento mínimo
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
                 // Considerar um tratamento de erro mais robusto, como impedir o uso da IA.
                 // showErrorToUser("Configuração da API do Gemini pendente. Funcionalidade de IA indisponível.");
                 // Se a chave for essencial, você pode querer retornar aqui ou lançar um erro.
            }
            
            // Mesmo que a chave não seja ideal, tentamos inicializar.
            // A biblioteca da Google pode lançar um erro se a chave for inválida.
            genAI = new GoogleGenerativeAI(apiKey || 'FALLBACK_INVALID_KEY'); // Usar um fallback inválido se apiKey for undefined


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
                systemInstructionText += ` Se solicitado um gráfico Plotly, forneça o código HTML completo e auto-contido para o gráfico usando o CDN do Plotly.js (use https://cdn.plot.ly/plotly-latest.min.js), dentro de uma estrutura JSON como esta: {"text": "sua explicação textual...", "plotly_html": "SEU_PLOTLY_HTML_AQUI"}. O HTML do Plotly deve ser responsivo (ex: <div id='plotly-div' style='width:100%;height:100%;'></div> e Plotly.newPlot('plotly-div', data, layout, {responsive: true});). Se não houver gráfico, apenas forneça a resposta textual. Certifique-se que o HTML do Plotly não contenha scripts externos além do CDN do Plotly.js e que o JSON seja válido.`;
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
            } catch (e) { console.warn("AI response was not valid JSON for Plotly, using raw text:", e); }

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

    const renderMessageItem = ({ item }) => {
        const isUser = item.sender === 'user';
        const markdownStyles = {
            body: { color: isUser ? colors.messageUserText : colors.messageAiText, fontSize: 16, lineHeight: 24, fontFamily: 'JetBrains-M' },
            heading1: { color: isUser ? colors.messageUserText : colors.messageAiText, fontWeight: 'bold', marginTop:12, marginBottom:6, borderBottomWidth:1, borderColor: colors.borderColor, paddingBottom: 6, fontFamily: 'Roboto-Bold'},
            link: { color: colors.accentSecondary, textDecorationLine: 'underline', fontFamily: 'JetBrains-M' },
            code_inline: { backgroundColor: isUser ? 'rgba(0,0,0,0.15)' : colors.bgElevation1, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 14 },
            code_block: { backgroundColor: isUser ? 'rgba(0,0,0,0.15)' : colors.bgElevation1, padding: 12, borderRadius: 6, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', marginVertical: 8, fontSize: 14 },
            table: { borderColor: colors.borderColor, borderWidth: 1, borderRadius: 6, marginVertical: 12 },
            th: { backgroundColor: colors.bgTertiary, padding: 8, borderBottomWidth:1, borderColor: colors.borderColor, color: colors.textPrimary, fontWeight: '600', fontFamily: 'JetBrains-Mono' },
            td: { padding: 8, borderBottomWidth:1, borderColor: colors.borderColor, color: colors.textPrimary, fontFamily: 'JetBrains-M' },
            list_item: { marginVertical: 4, flexDirection: 'row', alignItems: 'flex-start'},
            bullet_list_icon: { marginRight: 8, color: colors.textSecondary, fontSize: Platform.OS === 'ios' ? 10 : 16, lineHeight: 24 },
            ordered_list_icon: { marginRight: 8, color: colors.textSecondary, fontSize: 16, lineHeight: 24, fontFamily: 'JetBrains-M' },
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
            messageContent = item.text;
        }

        return (
            <View style={messageContainerStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    {!isUser && <MaterialCommunityIcons name="robot-happy-outline" size={22} color={colors.accentPrimary} style={{ marginRight: 8, marginTop: 2 }} />}
                    <View style={{ flex: 1 }}>
                        <Markdown style={markdownStyles}>
                            {messageContent + (item.isStreaming && !item.isError ? '▍' : '')}
                        </Markdown>
                        {item.isError && <Text style={{color: colors.danger, marginTop: 5, fontStyle: 'italic', fontSize: 13, fontFamily: 'Roboto-Italic'}}>Erro ao processar.</Text>}
                    </View>
                    {isUser && <MaterialIcons name="account-circle" size={22} color={colors.messageUserText} style={{ marginLeft: 8, marginTop: 2 }} />}
                </View>
                {item.plotly_html && (
                     <View style={styles.plotlyContainer(colors)}>
                         <WebView
                             originWhitelist={['*']}
                             source={{ html: `<body style="background-color:${colors.plotlyBg}; margin:0; padding:0; overflow: hidden;">${item.plotly_html}</body>` }}
                             style={{ flex:1, height: 300, backgroundColor: colors.plotlyBg }}
                             javaScriptEnabled={true} domStorageEnabled={true} scalesPageToFit={Platform.OS === 'android'} bounces={false}
                             onShouldStartLoadWithRequest={(event) => {
                                 if (event.url.startsWith('http') && !event.url.includes('cdn.plot.ly') && !event.url.startsWith('data:')) {
                                     Linking.openURL(event.url); return false;
                                 } return true;
                             }}
                             onError={(syntheticEvent) => { console.warn('WebView error: ', syntheticEvent.nativeEvent); }}
                             renderLoading={() => (<View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.plotlyBg}}><ActivityIndicator size="small" color={colors.accentPrimary} /></View>)}
                             startInLoadingState={true}
                         />
                     </View>
                 )}
            </View>
        );
    };

    const renderSuggestionCard = ({ item }) => (
        <TouchableOpacity
            style={styles.suggestionCard(colors, colors[item.borderColorThemeKey] || item.borderColorThemeKey)}
            onPress={() => handleSuggestionSelect(item.text)}
            activeOpacity={0.8}
        >
            <Text style={styles.suggestionCardText(colors)}>{item.text}</Text>
            <View style={styles.suggestionCardIconContainer(colors, colors[item.borderColorThemeKey] || item.borderColorThemeKey)}>
                <MaterialIcons name={item.icon || "help-outline"} size={18} color={colors.bgWhite} />
            </View>
        </TouchableOpacity>
    );

    const renderChatView = () => (
        <>
            {messages.length === 0 && !isLoading && (
                <ScrollView 
                    contentContainerStyle={styles.initialGreetingScrollViewContainer(colors)}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.initialGreetingContainer(colors)}>
                        <Text style={styles.greetingMainText(colors)}>
                            Olá <Text style={{color: colors.greetingHeader, fontWeight:'bold'}}>{userProfile.name || 'investidor'}</Text>
                        </Text>
                        <Text style={styles.greetingSubText(colors)}>Em que posso auxiliar hoje?</Text>
                        <View style={styles.suggestionCardsGrid}>
                            {initialSuggestions.slice(0, 4).map((item, index) => ( 
                                <View key={index} style={styles.suggestionCardWrapper}>
                                   {renderSuggestionCard({ item })}
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            )}
            {messages.length > 0 && (
                <FlatList
                    ref={scrollViewRef} data={messages} renderItem={renderMessageItem}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.messagesContainer(colors)}
                    contentContainerStyle={{ paddingBottom: 10, paddingTop: 10, paddingHorizontal: 10 }}
                    onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                />
            )}
            {isLoading && messages.length === 0 && ( 
                 <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: colors.bgSecondary}}>
                    <ActivityIndicator size="large" color={colors.accentPrimary}/>
                    <Text style={{color: colors.textSecondary, marginTop:15, fontSize: 16, fontFamily: 'JetBrains-M'}}>
                        {genAI ? "Conectando à IA..." : "Inicializando..."}
                    </Text>
                </View>
            )}
        </>
    );
    
    const renderHistoryView = () => (
        <View style={styles.panelContainer(colors)}>
            <View style={styles.panelHeader(colors)}>
                <MaterialIcons name="history" size={28} color={colors.accentPrimary} />
                <Text style={styles.panelTitle(colors)}>Histórico de Chats</Text>
                {historyItems.length > 0 && (
                    <TouchableOpacity onPress={clearAllHistory} style={styles.clearHistoryButton(colors)}>
                        <MaterialIcons name="delete-sweep" size={22} color={colors.danger} />
                        <Text style={styles.clearHistoryButtonText(colors)}>Limpar Tudo</Text>
                    </TouchableOpacity>
                )}
            </View>
            {historyItems.length === 0 ? (
                <View style={styles.emptyStateContainer(colors)}>
                    <MaterialCommunityIcons name="comment-remove-outline" size={60} color={colors.textPlaceholder} />
                    <Text style={styles.emptyStateText(colors)}>Nenhum chat salvo ainda.</Text>
                </View>
            ) : (
                <FlatList
                    data={historyItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.historyListItem(colors)} onPress={() => loadChatFromHistory(item)}>
                            <View style={{flex:1}}>
                                <Text style={styles.historyItemTitle(colors)} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.historyItemDate(colors)}>{new Date(item.date).toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity onPress={() => deleteHistoryItem(item.id)} style={{padding:8}}>
                                <MaterialIcons name="delete-outline" size={24} color={colors.danger} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );

    const renderSettingsView = () => (
        <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
            <View style={styles.panelHeader(colors, true)}>
                <MaterialIcons name="settings-applications" size={30} color={colors.accentPrimary} />
                <Text style={styles.panelTitle(colors)}>Configurações Avançadas</Text>
            </View>

            <View style={styles.settingGroup(colors)}>
                <Text style={styles.settingGroupTitle(colors)}>Pesquisa e Análise</Text>
                <View style={styles.settingItem(colors)}>
                    <MaterialIcons name="travel-explore" size={24} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                    <Text style={styles.settingLabel(colors)}>Pesquisa Web (Contexto):</Text>
                    <TouchableOpacity
                        style={[styles.checkboxBase(colors), enableDeepResearch && styles.checkboxChecked(colors)]}
                        onPress={() => setEnableDeepResearch(!enableDeepResearch)}
                    >
                        {enableDeepResearch && <MaterialIcons name="check" size={18} color={colors.buttonText} />}
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.actionButton(colors)} onPress={() => saveAppSettings(false)}>
                <MaterialIcons name="save" size={20} color={colors.buttonText} style={{marginRight: 10}}/>
                <Text style={styles.actionButtonText(colors)}>Salvar Config. Pesquisa</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderProfileView = () => (
        <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
             <View style={styles.panelHeader(colors, true)}>
                <MaterialIcons name="person-outline" size={30} color={colors.accentPrimary} />
                <Text style={styles.panelTitle(colors)}>Meu Perfil</Text>
            </View>
            <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Nome:</Text>
                <TextInput value={userProfile.name} onChangeText={text => setUserProfile(p => ({...p, name: text}))} style={styles.profileTextInput(colors)} placeholder="Seu nome" placeholderTextColor={colors.textPlaceholder}/>
            </View>
            <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Email:</Text>
                <TextInput value={userProfile.email} onChangeText={text => setUserProfile(p => ({...p, email: text}))} style={styles.profileTextInput(colors)} placeholder="seu@email.com" keyboardType="email-address" placeholderTextColor={colors.textPlaceholder}/>
            </View>
             <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Plano:</Text>
                <Text style={[styles.profileTextInput(colors), {textAlign:'right'}]}>{userProfile.plan}</Text>
            </View>
            <TouchableOpacity style={styles.actionButton(colors)} onPress={saveUserProfile}>
                <MaterialIcons name="save" size={20} color={colors.buttonText} style={{marginRight: 10}}/>
                <Text style={styles.actionButtonText(colors)}>Salvar Perfil</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderPreferencesView = () => (
         <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
            <View style={styles.panelHeader(colors, true)}>
                <MaterialCommunityIcons name="tune-variant" size={30} color={colors.accentPrimary} />
                <Text style={styles.panelTitle(colors)}>Preferências de Análise</Text>
            </View>
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
            <TouchableOpacity style={styles.actionButton(colors)} onPress={saveAnalysisPrefs}>
                <MaterialIcons name="save" size={20} color={colors.buttonText} style={{marginRight: 10}}/>
                <Text style={styles.actionButtonText(colors)}>Salvar Preferências</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderSidebar = () => (
        <LinearGradient colors={colors.sidebarGradient} style={styles.sidebar(colors)} start={{x:0.5, y:0}} end={{x:0.5, y:1}}>
            <TouchableOpacity style={styles.sidebarIconWrapper(colors)} onPress={() => setMenuModalVisible(true)}>
                <MaterialIcons name="menu" size={30} color={colors.bgWhite} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarIconWrapper(colors)} onPress={() => handleNewChat()}>
                <MaterialIcons name="add" size={32} color={colors.bgWhite} />
            </TouchableOpacity>
            <View style={{flex:1}} />
            <TouchableOpacity style={styles.sidebarIconWrapper(colors)} onPress={() => showView('history')}>
                <MaterialIcons name="history" size={28} color={colors.bgWhite} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarIconWrapper(colors)} onPress={() => showView('settings')}>
                <MaterialIcons name="settings" size={26} color={colors.bgWhite} />
            </TouchableOpacity>
        </LinearGradient>
    );

    const renderTopBar = () => (
        <View style={styles.topBar(colors)}>
            <TouchableOpacity style={styles.appNameTouchable(colors)} onPress={() => setAppNameDropdownVisible(true)} activeOpacity={0.7}>
                <View>
                    <Text style={styles.appNameText(colors)}>{APP_NAME_DISPLAY}</Text>
                    <View style={styles.appNameUnderline(colors)} />
                </View>
                <MaterialIcons name="arrow-drop-down" size={28} color={colors.textPrimary} style={{marginLeft: 5}} />
            </TouchableOpacity>
        </View>
    );

    const renderInputArea = () => (
        <View style={styles.inputAreaContainer(colors)}>
             {currentFile && (
                <View style={styles.filePreviewContainer(colors)}>
                    <MaterialIcons name={currentFile.mimeType?.startsWith("image/") ? "image" : "insert-drive-file"} size={20} color={colors.accentPrimary} />
                    <Text style={styles.fileNamePreview(colors)} numberOfLines={1}>{currentFile.name}</Text>
                    <TouchableOpacity onPress={removeFile} style={{padding:3}}><MaterialIcons name="close" size={20} color={colors.danger} /></TouchableOpacity>
                </View>
            )}
            <LinearGradient colors={colors.inputBorderGradient} start={{x:0, y:0.5}} end={{x:1,y:0.5}} style={styles.inputWrapperGradient(colors)}>
                <View style={styles.inputWrapper(colors)}>
                    <TouchableOpacity onPress={onAttachFilePress} style={styles.inputIconButton(colors)} disabled={isLoading}>
                        <MaterialIcons name="attach-file" size={26} color={isLoading ? colors.textPlaceholder : colors.accentPrimary} />
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
                            <MaterialIcons name="send" size={24} color={colors.buttonText} />}
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
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
                <View style={[styles.menuModalBase(colors), styles.hamburgerMenuModalPos(colors)]} onStartShouldSetResponder={() => true}>
                    <View style={styles.menuHeader(colors)}>
                        <MaterialIcons name="assessment" size={28} color={colors.accentPrimary} style={styles.menuAppIcon} />
                        <Text style={styles.menuTitle(colors)}>{APP_NAME_DISPLAY}</Text>
                    </View>
                    <TouchableOpacity style={styles.menuItem(colors, currentView === 'profile')} onPress={() => { showView('profile'); }}>
                        <MaterialIcons name="account-circle" size={24} color={currentView === 'profile' ? colors.accentPrimary : colors.textPrimary} />
                        <Text style={styles.menuItemText(colors, currentView === 'profile')}>Meu Perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem(colors, currentView === 'preferences')} onPress={() => { showView('preferences'); }}>
                        <MaterialCommunityIcons name="tune-variant" size={24} color={currentView === 'preferences' ? colors.accentPrimary : colors.textPrimary} />
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
                        <MaterialIcons name="logout" size={24} color={colors.danger} />
                        <Text style={[styles.menuItemText(colors), {color: colors.danger}]}>Sair (Limpar Tudo)</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const renderAppNameDropdownModal = () => (
        <Modal
            animationType="fade" transparent={true} visible={appNameDropdownVisible}
            onRequestClose={() => setAppNameDropdownVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setAppNameDropdownVisible(false)}>
                <View style={[styles.menuModalBase(colors), styles.appNameDropdownModalPos(colors)]} onStartShouldSetResponder={() => true}>
                    <Text style={styles.modalTitle(colors)}>Opções Rápidas</Text>

                    <View style={styles.settingItemModal(colors)}>
                        <MaterialIcons name={themeMode === 'dark' ? "brightness-7" : "brightness-4"} size={24} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                        <Text style={styles.settingLabel(colors)}>Tema:</Text>
                        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleButton(colors)}>
                            <Text style={styles.themeToggleButtonText(colors)}>Mudar para {themeMode === 'dark' ? 'Claro' : 'Escuro'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.settingItemModal(colors)}>
                        <MaterialCommunityIcons name="bank" size={24} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                        <Text style={styles.settingLabel(colors)}>Banco:</Text>
                        <TouchableOpacity onPress={() => {setBankModalVisible(true); setAppNameDropdownVisible(false);}} style={styles.themeToggleButton(colors)}>
                             <Text style={styles.themeToggleButtonText(colors)} numberOfLines={1} ellipsizeMode="tail">
                                {selectedBank.name === 'Nenhum Banco' ? 'Selecionar' : selectedBank.name}
                             </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.settingItemModal(colors)}>
                        <MaterialCommunityIcons name="brain" size={24} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                        <Text style={styles.settingLabel(colors)}>Modelo IA:</Text>
                        <View style={styles.pickerContainerDropdown(colors)}>
                            <Picker
                                selectedValue={selectedAiModelKey}
                                onValueChange={(itemValue) => setSelectedAiModelKey(itemValue)}
                                style={styles.pickerStyle(colors)}
                                dropdownIconColor={colors.textPrimary}
                                mode="dropdown"
                            >
                                {Object.entries(GEMINI_MODEL_MAPPING).map(([key, modelId]) => (
                                    <Picker.Item
                                        key={key}
                                        label={AI_MODELS_DISPLAY[modelId] || key}
                                        value={key}
                                        color={Platform.OS === 'android' ? colors.textPrimary : undefined}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>
                    <TouchableOpacity style={[styles.actionButton(colors), {marginTop:25}]} onPress={() => saveAppSettings(true)}>
                        <MaterialIcons name="check-circle-outline" size={20} color={colors.buttonText} style={{marginRight: 10}}/>
                        <Text style={styles.actionButtonText(colors)}>Confirmar Opções</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const renderBankSelectionModal = () => (
        <Modal
            animationType="slide" transparent={true} visible={bankModalVisible}
            onRequestClose={() => setBankModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setBankModalVisible(false)}>
                <View style={[styles.menuModalBase(colors), styles.bankSelectionModalContent(colors)]} onStartShouldSetResponder={() => true}>
                    <Text style={styles.modalTitle(colors)}>Selecione um Banco</Text>
                    <FlatList
                        data={banksData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.bankListItem(colors, selectedBank.id === item.id)}
                                onPress={() => {
                                    setSelectedBank(item);
                                    setBankModalVisible(false);
                                }}
                            >
                                <Image source={{ uri: item.logoUrl }} style={styles.bankLogo} resizeMode="contain" />
                                <Text style={styles.bankName(colors, selectedBank.id === item.id)}>{item.name}</Text>
                                {selectedBank.id === item.id && <MaterialIcons name="check-circle" size={24} color={colors.success} />}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.bankListSeparator(colors)} />}
                    />
                     <TouchableOpacity style={[styles.actionButton(colors), {marginTop:15}]} onPress={() => setBankModalVisible(false)}>
                        <Text style={styles.actionButtonText(colors)}>Fechar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"} // 'height' pode ser melhor em alguns casos
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
                            {currentView === 'chat' && renderChatView()}
                            {currentView === 'history' && renderHistoryView()}
                            {currentView === 'settings' && renderSettingsView()}
                            {currentView === 'profile' && renderProfileView()}
                            {currentView === 'preferences' && renderPreferencesView()}
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

// --- STYLES --- (Os estilos permanecem os mesmos da sua versão anterior)
const styles = StyleSheet.create({
    appContainer: (colors) => ({ flex: 1, backgroundColor: colors.bgPage }),
    mainRowContainer: () => ({ flex: 1, flexDirection: 'row' }),
    sidebar: (colors) => ({
        width: SIDEBAR_WIDTH,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 55,
        paddingBottom: 20,
        alignItems: 'center',
    }),
    sidebarIconWrapper: (colors) => ({
        paddingVertical: 20, 
        width: '100%',
        alignItems: 'center',
    }),
    mainContentColumn: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary }),
    topBar: (colors) => ({
        flexDirection: 'row',
        justifyContent: 'flex-start', 
        alignItems: 'center',
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 50,
        paddingBottom: 15,
        backgroundColor: colors.bgPrimary,
        minHeight: 70, 
    }),
    appNameTouchable: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    }),
    appNameText: (colors) => ({
        fontSize: 18, 
        fontWeight: '600', 
        color: colors.textPrimary,
        fontFamily: 'JetBrains-Mono', 
    }),
    appNameUnderline: (colors) => ({
        height: 2.5,
        backgroundColor: colors.appNameUnderline, 
        marginTop: 2,
        borderRadius: 2,
    }),
    chatOrViewArea: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary }),

    messagesContainer: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary }),
    messageBubbleBase: {
        maxWidth: '85%',
        paddingVertical: 12, 
        paddingHorizontal: 16,
        borderRadius: 20, 
        marginVertical: 6, 
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, 
        shadowRadius: 4,
        elevation: 2,
    },
    userMessageBubble: (colors) => ({
        backgroundColor: colors.messageUserBg,
        alignSelf: 'flex-end',
        marginRight:10,
        borderBottomRightRadius: 8 
    }),
    aiMessageBubble: (colors) => ({
        backgroundColor: colors.messageAiBg,
        alignSelf: 'flex-start',
        marginLeft:10,
        borderBottomLeftRadius: 8
    }),
    errorMessageBubble: (colors) => ({
        backgroundColor: colors.danger + '20', 
        borderColor: colors.danger,
        borderWidth:1
    }),
    plotlyContainer: (colors) => ({
        marginTop: 12,
        height: 300,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 12, 
        overflow: 'hidden',
        backgroundColor: colors.plotlyBg
    }),

    initialGreetingScrollViewContainer: (colors) => ({
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center', 
        backgroundColor: colors.bgSecondary,
        paddingBottom: 30, 
    }),
    initialGreetingContainer: () => ({
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20, 
        width: '100%', 
    }),
    greetingMainText: (colors) => ({
        fontSize: screenWidth > 400 ? 42 : 36, 
        fontWeight: '300', 
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8, 
        fontFamily: 'Roboto-Light',
        lineHeight: screenWidth > 400 ? 50 : 44,
    }),
    greetingSubText: (colors) => ({
        fontSize: screenWidth > 400 ? 20 : 18, 
        fontWeight: '400',
        color: colors.textSecondary,
        marginTop: 0,
        marginBottom: 30, 
        textAlign: 'center',
        fontFamily: 'JetBrains-M',
    }),
    suggestionCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around', 
        width: '100%',
        paddingHorizontal: 5, 
    },
    suggestionCardWrapper: {
        width: screenWidth > 700 ? '48%' : '100%', 
        marginBottom: 15, 
        paddingHorizontal: screenWidth > 700 ? 5 : 0, 
    },
    suggestionCard: (colors, borderColor) => ({
        backgroundColor: colors.bgCard,
        borderRadius: 16, 
        padding: 20, 
        borderWidth: 2, 
        borderColor: borderColor,
        flexDirection: 'column', 
        alignItems: 'flex-start', 
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 4,
        minHeight: 120, 
        justifyContent: 'space-between', 
    }),
    suggestionCardText: (colors) => ({
        fontSize: 16, 
        fontWeight: '500', 
        color: colors.textPrimary, 
        fontFamily: 'JetBrains-Mono',
        lineHeight: 22,
        marginBottom: 10, 
    }),
    suggestionCardIconContainer: (colors, iconBgColor) => ({
        padding: 8,
        borderRadius: 20, 
        backgroundColor: iconBgColor, 
        alignSelf: 'flex-end', 
    }),

    inputAreaContainer: (colors) => ({
        paddingHorizontal: 15, 
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10, 
        backgroundColor: colors.bgInputArea,
    }),
    filePreviewContainer: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal:12,
        paddingVertical:8,
        backgroundColor:colors.bgTertiary,
        borderRadius:20,
        marginBottom:10, 
        borderWidth:1,
        borderColor:colors.borderColor
    }),
    fileNamePreview: (colors) => ({
        flex:1,
        marginLeft:10,
        marginRight:8,
        color:colors.textSecondary,
        fontSize:14,
        fontFamily: 'JetBrains-M'
    }),
    inputWrapperGradient: (colors) => ({
        borderRadius: 30, 
        padding: 2, 
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    }),
    inputWrapper: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center', 
        backgroundColor: colors.inputBg,
        borderRadius: 28, 
        paddingHorizontal: 8, 
        minHeight: 58, 
    }),
    textInput: (colors) => ({
        flex: 1,
        color: colors.textPrimary,
        fontSize: 16,
        paddingHorizontal: 15, 
        paddingTop: Platform.OS === 'ios' ? 16 : 12, 
        paddingBottom: Platform.OS === 'ios' ? 16 : 12,
        maxHeight: 120,
        fontFamily: 'JetBrains-M',
    }),
    inputIconButton: () => ({
        padding: 10, 
        justifyContent: 'center',
        alignItems: 'center',
    }),
    sendButton: (colors) => ({
        backgroundColor: colors.accentPrimary,
        borderRadius: 22, 
        width: 44, height: 44, 
        margin: 4,
    }),
    sendButtonDisabled: (colors) => ({ backgroundColor: colors.textPlaceholder }),

    footerContainer: (colors) => ({
        paddingVertical: 12, 
        paddingHorizontal: 15,
        backgroundColor: colors.bgPrimary, 
        alignItems: 'center',
    }),
    footerText: (colors) => ({
        fontSize: 11, 
        color: colors.textSecondary,
        textAlign: 'center',
        fontFamily: 'JetBrains-M',
        letterSpacing: 0.2,
    }),

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center' }, 
    menuModalBase: (colors) => ({
        backgroundColor: colors.menuBg, 
        borderRadius: 16, 
        paddingBottom: 10, 
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 12,
        overflow: 'hidden',
    }),
    hamburgerMenuModalPos: (colors) => ({
        position: 'absolute',
        left: 0,
        top: 0, bottom: 0,
        width: Math.min(screenWidth * 0.8, 300), 
        minWidth: 280,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 45,
    }),
    appNameDropdownModalPos: (colors) => ({
        position: 'absolute',
        top: Platform.OS === 'android' ? StatusBar.currentHeight + 60 : 90, 
        left: SIDEBAR_WIDTH + 10,
        width: screenWidth - SIDEBAR_WIDTH - 30, 
        maxWidth: 380, 
        paddingTop: 20, 
    }),
    bankSelectionModalContent: (colors) => ({
        marginHorizontal: 20,
        maxHeight: screenHeight * 0.75, 
        width: screenWidth * 0.9,
        maxWidth: 480, 
        paddingTop: 20,
    }),
    menuHeader: (colors) => ({ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        marginBottom: 15, 
        borderBottomWidth:1, 
        borderBottomColor: colors.dividerColor, 
    }),
    menuAppIcon: { marginRight: 15 }, 
    menuTitle: (colors) => ({ fontSize: 20, fontWeight: '600', color: colors.textPrimary, flexShrink:1, fontFamily: 'JetBrains-Mono' }),
    menuItem: (colors, isActive = false) => ({
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 15, paddingHorizontal: 20, 
        backgroundColor: isActive ? colors.accentPrimary + '2A' : 'transparent', 
        borderRadius: isActive ? 12 : 0, 
        marginHorizontal: isActive ? 10 : 0, 
        marginBottom: 5, 
    }),
    menuItemText: (colors, isActive = false) => ({
        fontSize: 15, 
        color: isActive ? colors.accentPrimary : colors.textPrimary,
        marginLeft: 20, 
        fontWeight: isActive ? '600' : '400',
        fontFamily: isActive ? 'JetBrains-Mono' : 'JetBrains-M',
    }),
    modalTitle: (colors) => ({ fontSize: 22, fontWeight: '600', color: colors.textPrimary, marginBottom: 25, textAlign: 'center', paddingHorizontal:15, fontFamily: 'JetBrains-Mono' }),

    settingItem: (colors) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal:20, borderBottomWidth: 1, borderBottomColor: colors.dividerColor }),
    settingItemModal: (colors) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal:20, borderBottomWidth: 1, borderBottomColor: colors.dividerColor + '99', width: '100%' }),
    settingIcon: () => ({ marginRight: 18 }),
    settingLabel: (colors) => ({ fontSize: 16, color: colors.textPrimary, flex: 1, fontFamily: 'JetBrains-M' }),
    themeToggleButton: (colors) => ({ paddingVertical: 10, paddingHorizontal: 15, backgroundColor: colors.accentPrimary, borderRadius: 25, minWidth: 120, alignItems:'center' }),
    themeToggleButtonText: (colors) => ({ color: colors.buttonText, fontSize: 14, fontWeight: '500', fontFamily: 'JetBrains-Mono' }),

    pickerContainerDropdown: (colors) => ({ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 12, backgroundColor: colors.inputBg, justifyContent: 'center', minWidth: 160, maxWidth: screenWidth * 0.45, marginLeft: 10}),
    pickerContainerPrefs: (colors) => ({ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 12, backgroundColor: colors.inputBg, justifyContent: 'center', flex: 1, marginLeft: 12}),
    pickerStyle: (colors) => ({ height: 52, color: colors.textPrimary, width:'100%' }),

    checkboxBase: (colors) => ({ width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 2, borderColor: colors.accentPrimary, backgroundColor: colors.inputBg, marginLeft: 12 }),
    checkboxChecked: (colors) => ({ backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }),
    actionButton: (colors) => ({ backgroundColor: colors.accentPrimary, paddingVertical: 16, paddingHorizontal: 35, borderRadius: 100, alignSelf: 'center', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop:35, shadowColor: colors.shadowColor, shadowOffset:{width:0, height:3}, shadowOpacity:0.25, shadowRadius:4, elevation:4 }),
    actionButtonText: (colors) => ({ color: colors.buttonText, fontSize: 15, fontWeight: '500', fontFamily: 'JetBrains-Mono', letterSpacing: 0.1 }),

    panelContainer: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary, padding:20 }),
    panelScrollView: (colors) => ({ flex: 1, backgroundColor: colors.bgSecondary }),
    panelContent: () => ({ paddingHorizontal: 0, paddingVertical: 10, paddingBottom: 40 }), 
    panelHeader: (colors, centered = false) => ({ flexDirection: 'row', alignItems: 'center', marginBottom: 25, paddingBottom:15, borderBottomWidth:1, borderBottomColor: colors.dividerColor, justifyContent: centered ? 'center' : 'flex-start' }),
    panelTitle: (colors) => ({ fontSize: 24, fontWeight: '600', color: colors.textPrimary, marginLeft: 12, flex:1, fontFamily: 'JetBrains-Mono' }),

    historyListItem: (colors) => ({ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, paddingVertical:15, paddingHorizontal:18, borderRadius:12, marginBottom:12, shadowColor: colors.shadowColor, shadowOffset:{width:0,height:2}, shadowOpacity:0.08, shadowRadius:3, elevation:2 }),
    historyItemTitle: (colors) => ({ fontSize:16, fontWeight:'500', color:colors.textPrimary, marginBottom:4, fontFamily: 'JetBrains-Mono' }),
    historyItemDate: (colors) => ({ fontSize:12, color:colors.textSecondary, fontFamily: 'JetBrains-M' }),
    clearHistoryButton: (colors) => ({ flexDirection:'row', alignItems:'center', paddingVertical:6, paddingHorizontal:12, borderRadius:20, backgroundColor: colors.danger + '20'}),
    clearHistoryButtonText: (colors) => ({ color: colors.danger, fontSize:13, marginLeft:6, fontWeight:'500', fontFamily: 'JetBrains-Mono'}),
    emptyStateContainer: () => ({ flex:1, justifyContent:'center', alignItems:'center', padding:20 }),
    emptyStateText: (colors) => ({ fontSize:17, color:colors.textPlaceholder, marginTop:15, textAlign:'center', fontFamily: 'JetBrains-M' }),

    settingGroup: (colors) => ({ marginBottom: 30, backgroundColor: colors.bgCard, borderRadius:12, paddingVertical:10, shadowColor: colors.shadowColor, shadowOffset:{width:0,height:2}, shadowOpacity:0.08, shadowRadius:3, elevation:2}),
    settingGroupTitle: (colors) => ({ fontSize:14, fontWeight:'700', color:colors.textSecondary, paddingHorizontal:20, paddingTop:15, paddingBottom:8, textTransform:'uppercase', letterSpacing:0.2, fontFamily: 'ProductSans-Bold' }), 
    profileTextInput: (colors) => ({ flex:1, color: colors.textPrimary, fontSize: 16, paddingVertical:10, textAlign:'right', fontFamily: 'JetBrains-M'}),

    bankListItem: (colors, isSelected) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15, 
        paddingHorizontal: 18,
        borderRadius: 12, 
        backgroundColor: isSelected ? colors.accentPrimary + '2A' : colors.bgTertiary,
        marginBottom: 10, 
    }),
    bankLogo: { width: 40, height: 40, borderRadius: 20, marginRight: 18, backgroundColor: '#fff' }, 
    bankName: (colors, isSelected) => ({
        flex: 1,
        fontSize: 16,
        color: isSelected ? colors.accentPrimary : colors.textPrimary,
        fontWeight: isSelected ? '600' : '400',
        fontFamily: isSelected ? 'JetBrains-Mono' : 'JetBrains-M',
    }),
    bankListSeparator: (colors) => ({ height: 1, backgroundColor: colors.dividerColor, marginVertical: 4 }),
});