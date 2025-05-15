// WalkerTECHFinancerAI.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { GOOGLE_API_KEY_FROM_ENV } from './.env';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// --- Constants ---
const APP_VERSION = "WalkerTECH AI-Financer Pro v2.2 (Mobile/Gemini)";

const themes = {
    dark: {
        bgPrimary: '#0B0F14',
        bgSecondary: '#12171D',
        bgTertiary: '#1A2027',
        bgElevation1: 'rgba(255, 255, 255, 0.045)',
        textPrimary: '#F0F4F8',
        textSecondary: '#B0BAC6',
        textPlaceholder: '#7D8590',
        accentPrimary: '#4F86F7',
        accentSecondary: '#79C0FF',
        borderColor: '#2C333C',
        danger: '#DC3545',
        success: '#28A745',
        warning: '#FFC107',
        info: '#17A2B8',
        statusBar: 'light-content',
        inputBg: '#1A2027',
        messageUserBg: '#4F86F7',
        messageUserText: '#FFFFFF',
        messageAiBg: '#1A2027',
        messageAiText: '#F0F4F8',
        iconDefault: '#B0BAC6',
        buttonText: '#FFFFFF',
        shadowColor: '#000',
        plotlyBg: '#0B0F14',
    },
    light: {
        bgPrimary: '#F0F2F5',
        bgSecondary: '#FFFFFF',
        bgTertiary: '#E4E6EB',
        bgElevation1: 'rgba(0, 0, 0, 0.04)',
        textPrimary: '#1C1E21',
        textSecondary: '#606770',
        textPlaceholder: '#8A8D91',
        accentPrimary: '#007AFF',
        accentSecondary: '#58AFFF',
        borderColor: '#CED0D4',
        danger: '#DC3545',
        success: '#28A745',
        warning: '#FFC107',
        info: '#17A2B8',
        statusBar: 'dark-content',
        inputBg: '#FFFFFF',
        messageUserBg: '#007AFF',
        messageUserText: '#FFFFFF',
        messageAiBg: '#E4E6EB',
        messageAiText: '#1C1E21',
        iconDefault: '#606770',
        buttonText: '#FFFFFF',
        shadowColor: '#000',
        plotlyBg: '#FFFFFF',
    }
};

const banksData = [
    { id: 'none', name: 'Nenhum Banco', logoUrl: 'https://img.icons8.com/ios/50/000000/bank-building.png' },
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
    { text: "Compare CDBs e LCIs para meu perfil (com tabela e gráfico Plotly).", borderColor: "success", icon: "compare-arrows" },
    { text: "Qual a projeção da Selic para os próximos 6 meses? (com pesquisa web)", borderColor: "info", icon: "travel-explore" },
    { text: "Crie um gráfico de pizza da minha alocação ideal (40% RF, 30% Ações, 20% FIIs, 10% Global) com Plotly.", borderColor: "warning", icon: "pie-chart" },
    { text: "Me ajude a criar uma tabela comparativa de fundos de investimento com Plotly.", borderColor: "danger", icon: "table-chart" },
    { text: "Como o cenário macroeconômico atual afeta meus investimentos?", borderColor: "accentPrimary", icon: "insights" },
];

const AI_MODELS_DISPLAY = {
    "WalkerTECH_Pro_Max": "Gemini 1.5 Pro (Max)",
    "WalkerTECH_1.5_Pro": "Gemini 1.5 Pro",
    "WalkerTECH_1.5_Flash": "Gemini 1.5 Flash",
    "WalkerTECH_Compact": "Gemini 1.0 Pro (Compact)",
};
const GEMINI_MODEL_MAPPING = {
    "WalkerTECH_Pro_Max": "gemini-1.5-pro",
    "WalkerTECH_1.5_Pro": "gemini-2.0-flash", // Corrected: 1.5 Pro should map to a 1.5 Pro model
    "WalkerTECH_1.5_Flash": "gemini-1.5-flash",
    "WalkerTECH_Compact": "gemini-2.5-pro-preview-05-06", // Changed to standard text model for "Compact"
};
const DEFAULT_MODEL_KEY = "WalkerTECH_1.5_Pro";

const MAX_FILE_SIZE_MB = 25;
const MAX_HISTORY_ITEMS = 20;

// Initialize Google Generative AI using .env
const genAI = GOOGLE_API_KEY_FROM_ENV ? new GoogleGenerativeAI({ apiKey: GOOGLE_API_KEY_FROM_ENV }) : null;

// --- Main App Component ---
export default function WalkerTECHFinancerAI() {
    // --- State Variables ---
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [chatSession, setChatSession] = useState(null);
    const [currentView, setCurrentView] = useState('chat');

    const [selectedBank, setSelectedBank] = useState(banksData[0]);
    const [selectedAiModelKey, setSelectedAiModelKey] = useState(DEFAULT_MODEL_KEY);
    const [enableDeepResearch, setEnableDeepResearch] = useState(false);

    const [currentFile, setCurrentFile] = useState(null);

    const [themeMode, setThemeMode] = useState('dark');
    const colors = themes[themeMode];

    const [userProfile, setUserProfile] = useState({ name: 'Investidor Pro', email: 'investidor.pro@email.com', plan: 'pro' });
    const [analysisPreferences, setAnalysisPreferences] = useState({ risk: 'moderate', horizon: 'medium' });
    const [historyItems, setHistoryItems] = useState([]);

    const [menuModalVisible, setMenuModalVisible] = useState(false);
    const [bankModalVisible, setBankModalVisible] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [aiMessageIdCounter, setAiMessageIdCounter] = useState(0);

    const scrollViewRef = useRef();
    const appState = useRef(AppState.currentState);

    // --- useEffect Hooks ---
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

    const initializeApp = async () => {
        setIsLoading(true);
        if (!GOOGLE_API_KEY_FROM_ENV) {
            showErrorToUser("Chave de API do Google não configurada (EXPO_PUBLIC_GOOGLE_API_KEY). Funcionalidades de IA limitadas.");
        }
        await loadAppSettings();
        await loadUserProfile();
        await loadAnalysisPrefs();
        await loadChatHistory();
        await generateNewClientSessionId();
        setIsLoading(false);
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
            showErrorToUser("Serviço de IA não inicializado. Verifique a chave de API (EXPO_PUBLIC_GOOGLE_API_KEY).");
            return;
        }

        const currentMessageText = (typeof messageTextOverride === 'string' ? messageTextOverride : messageInput).trim();
        if (!currentMessageText && !currentFile) return;

        setIsLoading(true);
        setMessageInput('');

        const userMsgIdBase = `user-${Date.now()}`;
        let newMessages = [];

        if (currentFile) {
            newMessages.push({ id: `${userMsgIdBase}-file`, text: `Arquivo: ${currentFile.name}`, sender: 'user', timestamp: Date.now() });
        }
        if (currentMessageText) {
            newMessages.push({ id: userMsgIdBase, text: currentMessageText, sender: 'user', timestamp: Date.now() });
        }
        setMessages(prev => [...prev, ...newMessages]);

        const aiMessageId = `ai-${aiMessageIdCounter}`;
        setAiMessageIdCounter(prev => prev + 1);
        const initialAiMsg = { id: aiMessageId, text: "", sender: 'ai', isStreaming: true, timestamp: Date.now() };
        setMessages(prev => [...prev, initialAiMsg]);

        try {
            const modelName = GEMINI_MODEL_MAPPING[selectedAiModelKey] || GEMINI_MODEL_MAPPING[DEFAULT_MODEL_KEY];
            
            let effectiveModelName = modelName;
            if (currentFile && (modelName === "gemini-1.0-pro" || modelName === "gemini-pro")) {
                effectiveModelName = "gemini-1.5-flash"; // Switch to a multimodal model
                console.warn(`File attached, switching from ${modelName} to ${effectiveModelName}`);
            }
            
            const generativeModel = genAI.getGenerativeModel({
                model: effectiveModelName,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                ],
                generationConfig: {
                    temperature: 0.7,
                }
            });

            let currentChat = chatSession;
            if (!currentChat) {
                const sdkChatHistory = messages
                    .filter(msg => msg.id !== aiMessageId && !msg.isError && (msg.sender === 'user' || msg.sender === 'ai'))
                    .map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }],
                    }));
                
                let systemInstructionText = `Você é WalkerTECH Financer AI, um assistente financeiro especializado em finanças e investimentos no Brasil. Responda em Português Brasileiro.`;
                if (selectedBank && selectedBank.id !== 'none') systemInstructionText += ` Contexto bancário atual: ${selectedBank.name}.`;
                if (userProfile) systemInstructionText += ` Perfil do usuário: Nome: ${userProfile.name}, Plano: ${userProfile.plan}.`;
                if (analysisPreferences) systemInstructionText += ` Preferências de Análise: Risco: ${analysisPreferences.risk}, Horizonte de Investimento: ${analysisPreferences.horizon}.`;
                if (enableDeepResearch) systemInstructionText += ` O usuário habilitou pesquisa aprofundada na web; se necessário, indique que você buscaria informações atualizadas.`;
                systemInstructionText += ` Se solicitado um gráfico Plotly, forneça o código HTML completo e auto-contido para o gráfico usando o CDN do Plotly.js, dentro de uma estrutura JSON como esta: {"text": "sua explicação textual...", "plotly_html": "SEU_PLOTLY_HTML_AQUI"}. Se não houver gráfico, apenas forneça a resposta textual.`;

                currentChat = generativeModel.startChat({
                    history: sdkChatHistory,
                    systemInstruction: { parts: [{ text: systemInstructionText }], role: "system" }
                });
                setChatSession(currentChat);
            }

            const promptParts = [];
            if (currentFile) {
                const fileBase64 = await FileSystem.readAsStringAsync(currentFile.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                promptParts.push({
                    inlineData: { mimeType: currentFile.mimeType, data: fileBase64 },
                });
            }
            promptParts.push({ text: currentMessageText || (currentFile ? `Analise este arquivo: ${currentFile.name}`: "Olá") });

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
                const parsedJson = JSON.parse(accumulatedText.trim());
                if (parsedJson && typeof parsedJson.plotly_html === 'string') {
                    extractedPlotlyHtml = parsedJson.plotly_html;
                    finalReplyText = typeof parsedJson.text === 'string' ? parsedJson.text : ""; // Use text from JSON or empty
                }
                // If not JSON or doesn't fit the structure, finalReplyText remains accumulatedText
            } catch (e) {
                // Not JSON, finalReplyText is already accumulatedText.
            }

            finalizeAiMessage(aiMessageId, finalReplyText, false, extractedPlotlyHtml);
            if (currentFile) setCurrentFile(null);

        } catch (error) {
            console.error("Error sending message to Google AI:", error);
            let errorMessage = "Falha ao comunicar com a IA. Tente novamente.";
            if (error.message) {
                errorMessage = `Erro: ${error.message}`;
            }
            if (error.toString().includes("API key not valid")) {
                errorMessage = "Chave de API inválida. Verifique suas configurações (EXPO_PUBLIC_GOOGLE_API_KEY).";
            } else if (error.toString().includes("billing account")) {
                errorMessage = "Problema com a conta de faturamento do Google Cloud. Verifique o console do Google Cloud.";
            } else if (error.toString().includes("quota")) {
                errorMessage = "Cota de API excedida. Tente novamente mais tarde.";
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
                    return {
                        ...msg,
                        text: finalText !== null ? finalText : (msg.text || ""),
                        isError,
                        isStreaming: false,
                        plotly_html: plotlyHtml
                    };
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
        setChatSession(null);
        await generateNewClientSessionId();
        showView('chat');
    };

    // --- Local Storage ---
    const loadAppSettings = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('appTheme');
            if (savedTheme) setThemeMode(savedTheme);
            const savedModelKey = await AsyncStorage.getItem('selectedAiModelKey');
            if (savedModelKey && GEMINI_MODEL_MAPPING[savedModelKey]) setSelectedAiModelKey(savedModelKey);
            const deepResearch = await AsyncStorage.getItem('enableDeepResearch');
            if (deepResearch) setEnableDeepResearch(JSON.parse(deepResearch));
        } catch (e) { console.error("Failed to load app settings", e); }
    };
    const saveAppSettings = async () => {
        try {
            await AsyncStorage.setItem('appTheme', themeMode);
            await AsyncStorage.setItem('selectedAiModelKey', selectedAiModelKey);
            await AsyncStorage.setItem('enableDeepResearch', JSON.stringify(enableDeepResearch));
            alert("Configurações salvas!");
        } catch (e) { console.error("Failed to save app settings", e); showErrorToUser("Erro ao salvar configurações.");}
    };
    const loadUserProfile = async () => {
        try {
            const profile = await AsyncStorage.getItem('userProfile');
            if (profile) setUserProfile(JSON.parse(profile));
        } catch (e) { console.error("Failed to load user profile", e); }
    };
    const saveUserProfile = async () => {
        try {
            await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
            alert("Perfil salvo!");
        } catch (e) { console.error("Failed to save user profile", e); showErrorToUser("Erro ao salvar perfil.");}
    };
    const loadAnalysisPrefs = async () => {
        try {
            const prefs = await AsyncStorage.getItem('analysisPreferences');
            if (prefs) setAnalysisPreferences(JSON.parse(prefs));
        } catch (e) { console.error("Failed to load analysis preferences", e); }
    };
    const saveAnalysisPrefs = async () => {
        try {
            await AsyncStorage.setItem('analysisPreferences', JSON.stringify(analysisPreferences));
            alert("Preferências salvas!");
        } catch (e) { console.error("Failed to save analysis preferences", e); showErrorToUser("Erro ao salvar preferências.");}
    };

    const saveCurrentChatToHistory = async () => {
        if (messages.length > 0 && currentSessionId) {
            let historyStore = JSON.parse(await AsyncStorage.getItem('chatHistory') || '[]');
            const firstUserMessage = messages.find(m => m.sender === 'user');
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
            const savedHistory = await AsyncStorage.getItem('chatHistory');
            if (savedHistory) {
                setHistoryItems(JSON.parse(savedHistory));
            }
        } catch (e) { console.error("Failed to load chat history", e); }
    };
    
    const loadChatFromHistory = async (historyId) => {
        const chatToLoad = historyItems.find(item => item.id === historyId);
        if (chatToLoad) {
            if (messages.length > 0 && currentSessionId) {
                 await saveCurrentChatToHistory();
            }
            setMessages(chatToLoad.messages.map(m => ({ ...m })));
            setCurrentSessionId(chatToLoad.id);
            setChatSession(null);

            const bank = banksData.find(b => b.id === chatToLoad.selectedBankId) || banksData[0];
            setSelectedBank(bank);
            if (chatToLoad.selectedAiModelKey && GEMINI_MODEL_MAPPING[chatToLoad.selectedAiModelKey]) {
                setSelectedAiModelKey(chatToLoad.selectedAiModelKey);
            }
            setEnableDeepResearch(chatToLoad.enableDeepResearch || false);

            showView('chat');
        } else {
            showErrorToUser("Não foi possível carregar a conversa.");
        }
    };

    const onAttachFilePress = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                 type: ["image/*", "application/pdf", "text/*", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"],
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    showErrorToUser(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_MB}MB.`);
                    return;
                }
                setCurrentFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream', size: asset.size });
            }
        } catch (err) {
            console.warn(err);
            showErrorToUser("Erro ao selecionar arquivo.");
        }
    };

    const removeFile = () => setCurrentFile(null);

    const showErrorToUser = (message) => {
        console.error("USER_ERROR:", message);
        alert(message);
    };

    const toggleTheme = () => {
        const newTheme = themeMode === 'dark' ? 'light' : 'dark';
        setThemeMode(newTheme);
        AsyncStorage.setItem('appTheme', newTheme);
    };

    // --- Render Helper Functions ---
    const renderMessageItem = ({ item }) => {
        const isUser = item.sender === 'user';
        
        const markdownStyles = {
            body: { color: isUser ? colors.messageUserText : colors.messageAiText, fontSize: 16 },
            heading1: { color: isUser ? colors.messageUserText : colors.messageAiText, fontWeight: 'bold', marginTop:10, marginBottom:5, borderBottomWidth:1, borderColor: colors.borderColor, paddingBottom: 5},
            heading2: { color: isUser ? colors.messageUserText : colors.messageAiText, fontWeight: 'bold', marginTop:8, marginBottom:4},
            link: { color: colors.accentSecondary, textDecorationLine: 'underline' },
            code_inline: { backgroundColor: isUser ? 'rgba(0,0,0,0.1)' : colors.bgElevation1, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
            code_block: { backgroundColor: isUser ? 'rgba(0,0,0,0.1)' : colors.bgElevation1, padding: 10, borderRadius: 5, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', marginVertical: 5 },
            table: { borderColor: colors.borderColor, borderWidth: 1, borderRadius: 5, marginVertical: 10 },
            th: { backgroundColor: colors.bgTertiary, padding: 8, borderBottomWidth:1, borderColor: colors.borderColor, color: colors.textPrimary, fontWeight: 'bold' },
            td: { padding: 8, borderBottomWidth:1, borderColor: colors.borderColor },
            list_item: { marginVertical: 3 },
        };
        
        const messageContainerStyle = [
            styles.messageBubble,
            isUser ? styles.userMessageBubble(colors) : styles.aiMessageBubble(colors),
            isUser ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
            item.isError ? styles.errorMessageBubble(colors) : {}
        ];
        
        return (
            <View style={messageContainerStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    {!isUser && <MaterialCommunityIcons name="robot-happy-outline" size={22} color={colors.accentPrimary} style={{ marginRight: 8, marginTop: 2 }} />}
                    <View style={{ flex: 1 }}>
                        <Markdown style={markdownStyles}>
                            {item.text + (item.isStreaming ? '▍' : '')}
                        </Markdown>
                        {item.isError && <Text style={{color: colors.danger, marginTop: 5, fontStyle: 'italic'}}>Erro ao processar.</Text>}
                    </View>
                    {isUser && <MaterialIcons name="account-circle" size={22} color={colors.messageUserText} style={{ marginLeft: 8, marginTop: 2 }} />}
                </View>

                {item.plotly_html && (
                     <View style={styles.plotlyContainer(colors)}>
                         <WebView
                             originWhitelist={['*']}
                             source={{ html: `<body style="background-color:${colors.plotlyBg}; margin:0; padding:0; overflow: hidden;">${item.plotly_html}</body>` }}
                             style={{ flex:1, height: 300 }} // Ensure WebView has flex:1 if container has fixed height
                             javaScriptEnabled={true}
                             domStorageEnabled={true}
                             scalesPageToFit={Platform.OS === 'android'}
                             onShouldStartLoadWithRequest={(event) => {
                                 if (event.url.startsWith('http') && !event.url.includes('plotly.js') && !event.url.startsWith('data:')) {
                                     Linking.openURL(event.url);
                                     return false;
                                 }
                                 return true;
                             }}
                             onError={(syntheticEvent) => {
                                 const {nativeEvent} = syntheticEvent;
                                 console.warn('WebView error: ', nativeEvent);
                             }}
                         />
                     </View>
                 )}
            </View>
        );
    };
    
    const renderSuggestionCard = ({ item }) => (
        <TouchableOpacity
            style={styles.suggestionCard(colors, colors[item.borderColor] || item.borderColor)}
            onPress={() => handleSuggestionSelect(item.text)}
        >
            <Text style={styles.suggestionCardText(colors)}>{item.text}</Text>
            <MaterialIcons name={item.icon} size={24} color={colors.accentPrimary} style={{ alignSelf: 'flex-end' }} />
        </TouchableOpacity>
    );

    // --- Conditional Content Rendering ---
    const renderChatView = () => (
        <>
            {messages.length === 0 && !isLoading && (
                <View style={styles.initialGreetingContainer(colors)}>
                    <Text style={styles.greetingTitle(colors)}>Olá, <Text style={{color: colors.accentPrimary}}>investidor</Text>!</Text>
                    <Text style={styles.greetingSubtitle(colors)}>Em que posso auxiliar hoje?</Text>
                    <FlatList
                        data={initialSuggestions}
                        renderItem={renderSuggestionCard}
                        keyExtractor={(item, index) => index.toString()}
                        numColumns={2}
                        columnWrapperStyle={{ justifyContent: 'space-between'}}
                        contentContainerStyle={{ paddingHorizontal: 5 }}
                    />
                </View>
            )}
            <FlatList
                ref={scrollViewRef}
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.messagesContainer(colors)}
                contentContainerStyle={{ paddingBottom: 10, paddingTop: 10 }}
                onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            />
        </>
    );

    const renderHistoryView = () => (
        <View style={styles.placeholderPanel(colors)}>
            <MaterialCommunityIcons name="history" size={64} color={colors.accentPrimary} />
            <Text style={styles.placeholderTitle(colors)}>Histórico de Conversas</Text>
            {historyItems.length === 0 ? (
                <Text style={styles.placeholderText(colors)}>Nenhuma conversa no histórico.</Text>
            ) : (
                <FlatList
                    data={historyItems}
                    keyExtractor={item => item.id}
                    renderItem={({item}) => (
                        <TouchableOpacity style={styles.historyListItem(colors)} onPress={() => loadChatFromHistory(item.id)}>
                            <Text style={styles.historyItemTitle(colors)} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.historyItemDate(colors)}>{new Date(item.date).toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    )}
                    style={{width: '100%', marginTop: 20}}
                />
            )}
        </View>
    );

    const renderSettingsView = () => (
        <ScrollView style={styles.placeholderPanelScrollView(colors)} contentContainerStyle={styles.placeholderContent(colors)}>
            <MaterialIcons name="settings" size={64} color={colors.accentPrimary} />
            <Text style={styles.placeholderTitle(colors)}>Configurações Gerais</Text>

            <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Tema:</Text>
                <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleButton(colors)}>
                    <Text style={styles.themeToggleButtonText(colors)}>
                        Mudar para {themeMode === 'dark' ? 'Claro' : 'Escuro'}
                    </Text>
                </TouchableOpacity>
            </View>
            
            <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Modelo de IA:</Text>
                <View style={styles.pickerContainer(colors)}>
                    <Picker
                        selectedValue={selectedAiModelKey}
                        onValueChange={(itemValue) => setSelectedAiModelKey(itemValue)}
                        style={styles.pickerStyle(colors)}
                        dropdownIconColor={colors.textPrimary}
                    >
                        {Object.entries(AI_MODELS_DISPLAY).map(([key, name]) => (
                            <Picker.Item key={key} label={name} value={key} color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                        ))}
                    </Picker>
                </View>
            </View>
            
            <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Pesquisa Web (Contexto):</Text>
                 <TouchableOpacity
                    style={[styles.checkboxBase(colors), enableDeepResearch && styles.checkboxChecked(colors)]}
                    onPress={() => setEnableDeepResearch(!enableDeepResearch)}
                >
                    {enableDeepResearch && <MaterialIcons name="check" size={18} color={colors.buttonText} />}
                </TouchableOpacity>
            </View>
            
             <TouchableOpacity style={styles.actionButton(colors)} onPress={saveAppSettings}>
                <Text style={styles.actionButtonText(colors)}>Salvar Configurações</Text>
            </TouchableOpacity>
        </ScrollView>
    );
    
    const renderProfileView = () => (
        <ScrollView style={styles.placeholderPanelScrollView(colors)} contentContainerStyle={styles.placeholderContent(colors)}>
            <MaterialIcons name="account-circle" size={64} color={colors.accentPrimary} />
            <Text style={styles.placeholderTitle(colors)}>Meu Perfil</Text>
             <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Nome:</Text>
                <TextInput
                    style={styles.textInputSetting(colors)}
                    value={userProfile.name}
                    onChangeText={text => setUserProfile(p => ({...p, name: text}))}
                    placeholder="Seu Nome"
                    placeholderTextColor={colors.textPlaceholder}
                />
            </View>
            <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Email:</Text>
                <TextInput
                    style={styles.textInputSetting(colors)}
                    value={userProfile.email}
                    onChangeText={text => setUserProfile(p => ({...p, email: text}))}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    placeholderTextColor={colors.textPlaceholder}
                />
            </View>
            <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Plano:</Text>
                 <View style={styles.pickerContainer(colors)}>
                    <Picker
                        selectedValue={userProfile.plan}
                        onValueChange={value => setUserProfile(p => ({...p, plan: value}))}
                        style={styles.pickerStyle(colors)}
                        dropdownIconColor={colors.textPrimary}
                    >
                        <Picker.Item label="Pro" value="pro" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                        <Picker.Item label="Basic" value="basic" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                        <Picker.Item label="Free" value="free" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                    </Picker>
                </View>
            </View>
            <TouchableOpacity style={styles.actionButton(colors)} onPress={saveUserProfile}>
                <Text style={styles.actionButtonText(colors)}>Salvar Perfil</Text>
            </TouchableOpacity>
        </ScrollView>
    );
    
    const renderPreferencesView = () => (
         <ScrollView style={styles.placeholderPanelScrollView(colors)} contentContainerStyle={styles.placeholderContent(colors)}>
            <MaterialCommunityIcons name="tune-variant" size={64} color={colors.accentPrimary} />
            <Text style={styles.placeholderTitle(colors)}>Preferências de Análise</Text>
             <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Tolerância a Risco:</Text>
                <View style={styles.pickerContainer(colors)}>
                <Picker
                    selectedValue={analysisPreferences.risk}
                    onValueChange={value => setAnalysisPreferences(p => ({...p, risk: value}))}
                    style={styles.pickerStyle(colors)}
                    dropdownIconColor={colors.textPrimary}
                 >
                    <Picker.Item label="Baixo" value="low" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                    <Picker.Item label="Moderado" value="moderate" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                    <Picker.Item label="Alto" value="high" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                </Picker>
                </View>
            </View>
            <View style={styles.settingItem(colors)}>
                <Text style={styles.settingLabel(colors)}>Horizonte de Investimento:</Text>
                <View style={styles.pickerContainer(colors)}>
                <Picker
                    selectedValue={analysisPreferences.horizon}
                    onValueChange={value => setAnalysisPreferences(p => ({...p, horizon: value}))}
                    style={styles.pickerStyle(colors)}
                    dropdownIconColor={colors.textPrimary}
                 >
                    <Picker.Item label="Curto Prazo (até 1 ano)" value="short" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                    <Picker.Item label="Médio Prazo (1-5 anos)" value="medium" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                    <Picker.Item label="Longo Prazo (5+ anos)" value="long" color={Platform.OS === 'android' ? colors.textPrimary : undefined}/>
                </Picker>
                </View>
            </View>
            <TouchableOpacity style={styles.actionButton(colors)} onPress={saveAnalysisPrefs}>
                <Text style={styles.actionButtonText(colors)}>Salvar Preferências</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    // --- Main Return ---
    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // Adjusted for root KAV
        >
        <View style={styles.appContainer(colors)}>
            <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bgPrimary} />
            <View style={styles.header(colors)}>
                <TouchableOpacity onPress={() => setMenuModalVisible(true)} style={styles.headerIcon}>
                    <MaterialIcons name="menu" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle(colors)}>{APP_VERSION.split('(')[0].trim()}</Text>
                <TouchableOpacity onPress={() => setBankModalVisible(true)} style={styles.bankSelectorHeader(colors)}>
                    <Image source={{ uri: selectedBank.logoUrl }} style={styles.bankLogoSmall} onError={(e) => console.log("Error loading bank logo in header:", e.nativeEvent.error)} />
                    <Text style={styles.bankNameSmall(colors)} numberOfLines={1}>{selectedBank.name}</Text>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.contentArea(colors)}>
                {currentView === 'chat' && renderChatView()}
                {currentView === 'history' && renderHistoryView()}
                {currentView === 'settings' && renderSettingsView()}
                {currentView === 'profile' && renderProfileView()}
                {currentView === 'preferences' && renderPreferencesView()}
            </View>

            {currentView === 'chat' && (
                <View style={styles.inputArea(colors)}>
                    {currentFile && (
                        <View style={styles.filePreviewContainer(colors)}>
                            <MaterialIcons name={currentFile.mimeType?.startsWith("image/") ? "image" : "insert-drive-file"} size={20} color={colors.accentPrimary} />
                            <Text style={styles.fileNamePreview(colors)} numberOfLines={1}>{currentFile.name}</Text>
                            <TouchableOpacity onPress={removeFile}>
                                <MaterialIcons name="close" size={20} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputWrapper(colors)}>
                        <TouchableOpacity onPress={onAttachFilePress} style={styles.iconButton(colors)} disabled={isLoading}>
                            <MaterialIcons name="attach-file" size={26} color={isLoading ? colors.textPlaceholder : colors.accentPrimary} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.textInput(colors)}
                            value={messageInput}
                            onChangeText={setMessageInput}
                            placeholder="Pergunte algo..."
                            placeholderTextColor={colors.textPlaceholder}
                            multiline
                            editable={!isLoading}
                        />
                        <TouchableOpacity 
                            onPress={() => handleSendMessage()} 
                            style={styles.sendButton(colors)} 
                            disabled={isLoading || (!messageInput.trim() && !currentFile)}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={colors.buttonText} />
                            ) : (
                                <MaterialIcons name="send" size={24} color={colors.buttonText} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <Modal
                animationType="fade"
                transparent={true}
                visible={menuModalVisible}
                onRequestClose={() => setMenuModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setMenuModalVisible(false)}>
                    <View style={styles.menuModalContent(colors)} onStartShouldSetResponder={() => true}>
                        <Text style={styles.menuTitle(colors)}>Menu</Text>
                        <TouchableOpacity style={styles.menuItem(colors)} onPress={() => { handleNewChat(); }}>
                            <MaterialIcons name="add-comment" size={24} color={colors.textPrimary} />
                            <Text style={styles.menuItemText(colors)}>Nova Conversa</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem(colors)} onPress={() => { showView('history'); }}>
                            <MaterialIcons name="history" size={24} color={colors.textPrimary} />
                            <Text style={styles.menuItemText(colors)}>Histórico</Text>
                        </TouchableOpacity>
                         <TouchableOpacity style={styles.menuItem(colors)} onPress={() => { showView('profile'); }}>
                            <MaterialIcons name="account-circle" size={24} color={colors.textPrimary} />
                            <Text style={styles.menuItemText(colors)}>Meu Perfil</Text>
                        </TouchableOpacity>
                         <TouchableOpacity style={styles.menuItem(colors)} onPress={() => { showView('preferences'); }}>
                            <MaterialCommunityIcons name="tune-variant" size={24} color={colors.textPrimary} />
                            <Text style={styles.menuItemText(colors)}>Preferências de Análise</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem(colors)} onPress={() => { showView('settings'); }}>
                            <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
                            <Text style={styles.menuItemText(colors)}>Configurações</Text>
                        </TouchableOpacity>
                         <TouchableOpacity style={styles.menuItem(colors)} onPress={async () => {
                                await AsyncStorage.clear();
                                setMenuModalVisible(false);
                                alert('Logout: Sessão local encerrada. Preferências e histórico limpos.');
                                // Reset states to default before re-initializing
                                setMessages([]);
                                setCurrentFile(null);
                                setUserProfile({ name: 'Investidor Pro', email: 'investidor.pro@email.com', plan: 'pro' });
                                setAnalysisPreferences({ risk: 'moderate', horizon: 'medium' });
                                setHistoryItems([]);
                                setSelectedBank(banksData[0]);
                                setSelectedAiModelKey(DEFAULT_MODEL_KEY);
                                setEnableDeepResearch(false);
                                setThemeMode('dark'); // Or your default theme
                                setCurrentSessionId(null); // Explicitly clear session
                                setChatSession(null);
                                await initializeApp(); // Re-initialize core parts
                            }}>
                            <MaterialIcons name="logout" size={24} color={colors.danger} />
                            <Text style={[styles.menuItemText(colors), {color: colors.danger}]}>Sair (Limpar Tudo)</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={bankModalVisible}
                onRequestClose={() => setBankModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setBankModalVisible(false)}>
                    <View style={styles.bankModalContent(colors)} onStartShouldSetResponder={() => true}>
                        <Text style={styles.menuTitle(colors)}>Selecionar Banco</Text>
                        <FlatList
                            data={banksData}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.bankListItem(colors, item.id === selectedBank.id)}
                                    onPress={() => {
                                        setSelectedBank(item);
                                        setBankModalVisible(false);
                                    }}
                                >
                                    <Image source={{ uri: item.logoUrl }} style={styles.bankLogoList} onError={(e) => console.log("Error loading bank logo in list:", e.nativeEvent.error)} />
                                    <Text style={styles.bankNameList(colors)}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
        </KeyboardAvoidingView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    appContainer: (colors) => ({
        flex: 1,
        backgroundColor: colors.bgPrimary, // Changed to bgPrimary for the main shell
    }),
    header: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : (Platform.OS === 'ios' ? 40 : 10),
        paddingBottom: 10,
        backgroundColor: colors.bgPrimary, // Consistent with appContainer or can be distinct
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
    }),
    headerIcon: {
        padding: 5,
    },
    headerTitle: (colors) => ({
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
        maxWidth: screenWidth * 0.5,
    }),
    bankSelectorHeader: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        backgroundColor: colors.bgTertiary,
        maxWidth: screenWidth * 0.30,
    }),
    bankLogoSmall: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 6,
    },
    bankNameSmall: (colors) => ({
        fontSize: 12,
        color: colors.textSecondary,
        marginRight: 3,
        flexShrink: 1,
    }),
    contentArea: (colors) => ({
        flex: 1,
        backgroundColor: colors.bgSecondary, // Main content area distinct from shell
    }),
    messagesContainer: (colors) => ({
        flex: 1,
        paddingHorizontal: 10,
        backgroundColor: colors.bgSecondary, // Explicitly set
    }),
    messageBubble: {
        maxWidth: '85%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        marginVertical: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 1.5,
        elevation: 1,
    },
    userMessageBubble: (colors) => ({
        backgroundColor: colors.messageUserBg,
        borderBottomRightRadius: 5,
    }),
    aiMessageBubble: (colors) => ({
        backgroundColor: colors.messageAiBg,
        borderBottomLeftRadius: 5,
    }),
    errorMessageBubble: (colors) => ({
        backgroundColor: colors.danger + '25',
        borderColor: colors.danger,
        borderWidth: 1,
    }),
    plotlyContainer: (colors) => ({
        marginTop: 10,
        height: 300,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: colors.plotlyBg,
    }),
    initialGreetingContainer: (colors) => ({
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.bgSecondary,
    }),
    greetingTitle: (colors) => ({
        fontSize: 26,
        fontWeight: '300',
        color: colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    }),
    greetingSubtitle: (colors) => ({
        fontSize: 17,
        fontWeight: '300',
        color: colors.textSecondary,
        marginBottom: 25,
        textAlign: 'center',
    }),
    suggestionCard: (colors, borderColor) => ({
        backgroundColor: colors.bgTertiary,
        borderRadius: 12,
        padding: 12,
        width: (screenWidth / 2) - 25,
        margin: 5,
        minHeight: 110,
        justifyContent: 'space-between',
        borderLeftWidth: 3, // Slightly reduced border width
        borderLeftColor: borderColor,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    }),
    suggestionCardText: (colors) => ({
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
        marginBottom: 8,
        lineHeight: 18,
    }),
    inputArea: (colors) => ({
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: colors.borderColor,
        backgroundColor: colors.bgPrimary, // Consistent with appContainer/header
    }),
    filePreviewContainer: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.bgTertiary,
        borderRadius: 8,
        marginBottom: 8,
    }),
    fileNamePreview: (colors) => ({
        flex: 1,
        marginLeft: 10,
        marginRight: 5,
        color: colors.textSecondary,
        fontSize: 13,
    }),
    inputWrapper: (colors) => ({
        flexDirection: 'row',
        alignItems: 'flex-end', // Good for multiline
        backgroundColor: colors.inputBg,
        borderRadius: 25, // Pill shape
        paddingHorizontal: 8,
        paddingVertical: Platform.OS === 'ios' ? 8 : 0, // Android handled by minHeight and TextInput padding
        minHeight: 48,
        borderWidth: 1,
        borderColor: colors.borderColor,
    }),
    iconButton: (colors) => ({
        padding: 8,
        marginLeft: 2,
        marginRight: 4,
        justifyContent: 'center',
        alignItems: 'center',
        height: 48, // Match minHeight of wrapper for vertical alignment
    }),
    textInput: (colors) => ({
        flex: 1,
        color: colors.textPrimary,
        fontSize: 16,
        paddingHorizontal: 8,
        paddingTop: Platform.OS === 'ios' ? 10 : 12, // Vertical padding for text input
        paddingBottom: Platform.OS === 'ios' ? 10 : 12,
        maxHeight: 100, // Limit multiline expansion
    }),
    sendButton: (colors) => ({
        backgroundColor: colors.accentPrimary,
        borderRadius: 20, // Circular
        padding: 8,
        marginLeft: 6,
        justifyContent: 'center',
        alignItems: 'center',
        height: 40, // Fixed size
        width: 40,  // Fixed size
        alignSelf: 'flex-end', // Align with bottom of multiline input
        marginBottom: Platform.OS === 'ios' ? 4 : 4, // Consistent alignment with input text
    }),
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-start', // For side menu
        // alignItems: 'flex-start', // For side menu
    },
    menuModalContent: (colors) => ({
        backgroundColor: colors.bgPrimary,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : (Platform.OS === 'ios' ? 55 : 20),
        paddingHorizontal: 20,
        paddingBottom: 30,
        width: screenWidth * 0.80,
        height: '100%',
        borderRightWidth: 1,
        borderRightColor: colors.borderColor,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 1, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 8,
    }),
    menuTitle: (colors) => ({
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 20,
        marginTop: 15,
    }),
    menuItem: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    }),
    menuItemText: (colors) => ({
        fontSize: 16,
        color: colors.textPrimary,
        marginLeft: 18,
    }),
    bankModalContent: (colors) => ({
        position: 'absolute',
        bottom: 0,
        left:0,
        right:0,
        backgroundColor: colors.bgPrimary,
        paddingTop: 20,
        paddingHorizontal: 15,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        maxHeight: screenHeight * 0.65,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    }),
    bankListItem: (colors, isSelected) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal:10,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor + '99',
        backgroundColor: isSelected ? colors.accentPrimary + '2A' : 'transparent',
        borderRadius: isSelected ? 10 : 0,
        marginBottom: isSelected ? 2 : 0,
    }),
    bankLogoList: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 15,
    },
    bankNameList: (colors) => ({
        fontSize: 16,
        color: colors.textPrimary,
    }),
    placeholderPanel: (colors) => ({
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 25,
        backgroundColor: colors.bgSecondary,
    }),
    placeholderPanelScrollView: (colors) => ({
        flex: 1,
        backgroundColor: colors.bgSecondary,
    }),
    placeholderContent: (colors) => ({
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 25,
    }),
    placeholderTitle: (colors) => ({
        fontSize: 22,
        fontWeight: '500',
        color: colors.textPrimary,
        marginTop: 18,
        marginBottom: 12,
        textAlign: 'center',
    }),
    placeholderText: (colors) => ({
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 22,
        lineHeight: 21,
    }),
    settingItem: (colors) => ({
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor + '60',
        width: '100%',
    }),
    settingLabel: (colors) => ({
        fontSize: 16,
        color: colors.textPrimary,
        flexShrink: 1,
        marginRight: 10,
    }),
    themeToggleButton: (colors) => ({
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: colors.accentPrimary,
        borderRadius: 20,
    }),
    themeToggleButtonText: (colors) => ({
        color: colors.buttonText,
        fontSize: 14,
        fontWeight: '500',
    }),
    pickerContainer: (colors) => ({
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 8,
        flexGrow: 1,
        minWidth: 150,
        maxWidth: screenWidth * 0.5,
        backgroundColor: colors.inputBg,
        justifyContent: 'center',
    }),
    pickerStyle: (colors) => ({
        height: 50,
        color: colors.textPrimary,
    }),
    checkboxBase: (colors) => ({
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.accentPrimary,
        backgroundColor: colors.bgSecondary,
        marginLeft: 10,
    }),
    checkboxChecked: (colors) => ({
        backgroundColor: colors.accentPrimary,
    }),
    textInputSetting: (colors) => ({
        flexGrow: 1,
        marginLeft:10,
        height: 45,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        color: colors.textPrimary,
        backgroundColor: colors.inputBg,
        fontSize: 15,
    }),
    actionButton: (colors) => ({
        backgroundColor: colors.accentPrimary,
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 25,
        marginTop: 35,
        alignSelf: 'center',
        minWidth: screenWidth * 0.5,
        alignItems: 'center',
    }),
    actionButtonText: (colors) => ({
        color: colors.buttonText,
        fontSize: 16,
        fontWeight: '600',
    }),
    historyListItem: (colors) => ({
        backgroundColor: colors.bgTertiary,
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    }),
    historyItemTitle: (colors) => ({
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
        marginRight: 10,
    }),
    historyItemDate: (colors) => ({
        fontSize: 12,
        color: colors.textSecondary,
    }),
});