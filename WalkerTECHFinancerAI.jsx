import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { FunctionCallingMode, GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TextInput,
    TouchableOpacity,
    View,
    LayoutAnimation,
    UIManager
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Markdown from 'react-native-markdown-display';

// --- Google Charts Import (for Web) ---
let Chart;
if (Platform.OS === 'web') {
    try {
        Chart = require('react-google-charts').Chart;
    } catch (e) {
        console.warn("react-google-charts library not found. Charts will not render on web.", e);
        Chart = null; // Ensure Chart is defined, even if null
    }
}

// --- Enable LayoutAnimation for Android ---
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- Helper function for converting HEX to RGBA for boxShadow ---
function hexToRgba(hex, opacity) {
    if (!hex) return `rgba(0,0,0,${opacity || 0.1})`;
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('#')) {
        hex = hex.slice(1);
    }
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex[0] + hex[1], 16);
        g = parseInt(hex[2] + hex[3], 16);
        b = parseInt(hex[4] + hex[5], 16);
    } else {
        return `rgba(0,0,0,${opacity || 0.1})`; // Fallback for invalid hex
    }
    return `rgba(${r},${g},${b},${opacity})`;
}


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// --- Screen Size Adaptation ---
// Defines how elements are scaled based on screen size and platform.
// Goal:
// - Mobile (e.g., 1080x1440 physical, typically < 768dp width): Elements should be smaller. S_SF = 0.85.
// - Web (720p, 1080p, 1440p, 4K): Elements should be normal size. S_SF = 1.0.
// - Tablets: Elements should be normal size. S_SF = 1.0.

let isCurrentlySmallScreen;
let currentScaleFactor = 1.0; // Default: no scaling

if (Platform.OS === 'web') {
    // For web, all specified resolutions (720p, 1080p, 1440p, 4K) should have normal element sizes.
    isCurrentlySmallScreen = false;
    currentScaleFactor = 1.0;
} else {
    // For mobile (Android/iOS)
    // The request is "todos os elementos menores" for 1080x1440 mobile resolution.
    // We interpret this as phone-sized screens should have smaller elements.
    // Assuming 1080px physical width maps to a dp/pt width < 768 (e.g., 360dp for 3x density, 540dp for 2x density).
    if (screenWidth < 768) { // Threshold for typical phone dp/pt widths
        isCurrentlySmallScreen = true;
        currentScaleFactor = 0.55; // Apply ~15% reduction for smaller elements
    } else {
        // Larger mobile screens (tablets) or very high-density phones that result in screenWidth (dp/pt) >= 768
        isCurrentlySmallScreen = false;
        currentScaleFactor = 1.0;
    }
}

const IS_SMALL_SCREEN = isCurrentlySmallScreen; // Used in some style calculations directly
const S_SF = currentScaleFactor; // S_SF (Scaling Factor) to be used by scale functions
const scale = (value) => Math.round(value * S_SF);
const scaleFont = (value) => Math.round(value * S_SF);


const APP_NAME_DISPLAY = "WalkerTECH-AI-Financer";
const EXPANDED_SIDEBAR_WIDTH = scale(70);
const COLLAPSED_SIDEBAR_WIDTH = scale(40); // Minimal width for toggle arrow

// --- THEME DEFINITIONS (REFINED FOR ATTRACTIVENESS) ---
const themes = {
    dark: {
        // Core Backgrounds
        bgPage: '#0D0D0D', // Um pouco mais profundo que o original
        bgPrimary: '#101010', // Base escura sólida
        bgSecondary: '#181818', // Para elementos secundários, ligeiramente mais claro
        bgTertiary: '#202020', // Para superfícies ainda mais elevadas
        bgCard: '#1C1C1C', // Cartões se destacam sutilmente
        bgInputArea: '#101010', // Consistente com o bgPrimary
        bgElevation1: 'rgba(255, 255, 255, 0.08)', // Sutil elevação
        bgWhite: '#1C1C1C', // Cor de cartão para "branco" no escuro
        bgSurface: '#1C1C1C', // Superfícies interativas

        // Typography
        textPrimary: '#FFFFFF', // MODIFIED: Mantido branco puro conforme solicitado
        textSecondary: '#FFFFFF', // User-specified: Mantido branco puro para texto secundário
        textPlaceholder: '#7A7A7A', // Um cinza mais suave
        textOnAccent: '#FFFFFF',
        greetingHeader: '#E91E63', // Um rosa vibrante e acolhedor

        // Accents & Branding
        accentPrimary: '#BE93FD', // Lilás mais suave e moderno
        accentSecondary: '#00BFA5', // Teal vibrante e moderno
        appNameUnderline: '#BE93FD',

        // Borders & Dividers
        borderColor: '#2D2D2D', // Borda sutil
        dividerColor: '#353535', // Divisor um pouco mais visível

        // Semantic & Status Colors
        danger: '#E57373', // Vermelho mais suave para perigo
        success: '#81C784', // Verde mais suave para sucesso
        warning: '#FFB74D', // Laranja suave para aviso
        info: '#64B5F6',   // Azul suave para informação
        infoLink: '#64B5F6',
        magenta: '#E91E63', // Consistente com greetingHeader

        // Component Specific
        statusBar: 'light-content',
        inputBg: '#252525', // Fundo de input ligeiramente destacado
        messageUserBg: '#5E35B1', // Roxo profundo para mensagens do usuário
        messageUserText: '#FFFFFF',
        messageAiBg: '#282828', // Fundo sutil para mensagens da IA
        messageAiText: '#E0E0E0',
        menuBg: '#1A1A1A',
        switchActiveBg: '#BE93FD',
        bannerBg: '#5E35B1', // Consistente com messageUserBg

        // Icons & Buttons
        iconDefault: '#AEAEAE',
        iconMuted: '#7A7A7A',
        buttonText: '#FFFFFF',

        // Shadows
        shadowColor: '#000000',
        shadowOpacity: 0.3, // Sombras um pouco mais pronunciadas para profundidade

        // Gradients
        sidebarGradient: ['#5E35B1', '#4527A0', '#101010'], // Roxo profundo para mais escuro -> BG primário
        inputBorderGradient: ['#BE93FD', '#9F72E3'], // Gradiente sutil do acento primário
        gradientButtonPrimary: ['#BE93FD', '#A050F0'], // Lilás para um roxo mais intenso
        gradientCard: ['#222222', '#1A1A1A'], // Gradiente sutil para cartões
        gradientTopBar: ['#131313', '#0D0D0D'], // Gradiente sutil para a barra superior

        // Card Border Variants
        cardBorderGreen: '#81C784',
        cardBorderYellow: '#FFB74D',
        cardBorderBlue: '#64B5F6',
        cardBorderMagenta: '#E91E63',
    },
    light: {
        // Core Backgrounds
        bgPage: '#F8F9FA', // Um off-white muito claro e limpo
        bgPrimary: '#FFFFFF', // Branco puro para a área principal
        bgSecondary: '#F1F3F5', // Cinza muito claro para áreas secundárias
        bgTertiary: '#E9ECEF', // Cinza um pouco mais escuro para outras áreas
        bgCard: '#FFFFFF', // Cartões brancos e limpos
        bgInputArea: '#FFFFFF', // Área de input branca
        bgElevation1: 'rgba(0, 0, 0, 0.04)', // Elevação sutil
        bgWhite: '#FFFFFF',
        bgSurface: '#FEF7FF', // Superfície com um leve toque de lavanda (original)

        // Typography
        textPrimary: '#000000', // MODIFIED: Mantido preto puro conforme solicitado
        textSecondary: '#343A40', // Cinza escuro para boa legibilidade
        textPlaceholder: '#6C757D', // Cinza médio para placeholder
        textOnAccent: '#FFFFFF',
        greetingHeader: '#D81B60', // Um magenta profundo e elegante

        // Accents & Branding
        accentPrimary: '#7B1FA2', // Roxo mais profundo e rico
        accentSecondary: '#0277BD', // Azul clássico e confiável
        appNameUnderline: '#7B1FA2',

        // Borders & Dividers
        borderColor: '#CED4DA', // Cinza claro para bordas
        dividerColor: '#ADB5BD', // Cinza um pouco mais escuro para divisores

        // Semantic & Status Colors
        danger: '#C62828', // Vermelho forte e claro
        success: '#2E7D32', // Verde escuro para sucesso (original)
        warning: '#EF6C00', // Laranja vibrante para aviso
        info: '#1565C0',    // Azul informativo
        infoLink: '#0277BD', // Consistente com accentSecondary
        magenta: '#D81B60', // Consistente com greetingHeader

        // Component Specific
        statusBar: 'dark-content',
        inputBg: '#FCFAFF', // Fundo de input quase branco, levemente off-white
        messageUserBg: '#673AB7', // Roxo vibrante para mensagens do usuário
        messageUserText: '#FFFFFF',
        messageAiBg: '#EDE7F6',   // Lavanda muito claro para mensagens da IA
        messageAiText: '#212529', // Texto escuro para contraste
        menuBg: '#FFFFFF',
        switchActiveBg: '#673AB7',
        bannerBg: '#4A0072', // Um roxo bem escuro e saturado (original)

        // Icons & Buttons
        iconDefault: '#495057',
        iconMuted: '#6C757D',
        buttonText: '#FFFFFF',

        // Shadows
        shadowColor: '#404050', // Sombra suave
        shadowOpacity: 0.12, // Opacidade padrão para sombras em tema claro

        // Gradients
        sidebarGradient: ['#7B1FA2', '#D81B60'], // Roxo para Magenta (original, mas com cores refinadas)
        inputBorderGradient: ['#9C27B0', '#7B1FA2'], // Gradiente sutil do acento primário (Roxo mais claro para o acento)
        gradientButtonPrimary: ['#8E24AA', '#7B1FA2'], // Roxo mais claro para o acento primário
        gradientCard: ['#FFFFFF', '#FDFBFE'], // Gradiente muito sutil para cartões
        gradientTopBar: ['#FFFFFF', '#F8F9FA'], // Branco para o bgPage

        // Card Border Variants
        cardBorderGreen: '#388E3C', // Verde um pouco mais vibrante
        cardBorderYellow: '#FBC02D', // Amarelo mais vibrante
        cardBorderBlue: '#0288D1',  // Azul mais vibrante
        cardBorderMagenta: '#C2185B',// Magenta (original)
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

const allEconomySuggestions = [
    { text: "Crie uma tabela comparativa em Markdown entre guardar dinheiro na poupança e viver apenas com o salário, destacando fatores como poder de compra, inflação, rendimento real, estabilidade, imprevistos, metas e segurança financeira.", borderColorThemeKey: "cardBorderGreen", icon: "account-balance" },
    { text: "Compare em formato de tabela Markdown diferentes tipos de aplicações financeiras no Brasil (Poupança, CDB, Tesouro Direto, Fundos, Ações) por rentabilidade, liquidez, risco, IR, mínimo e perfil.", borderColorThemeKey: "cardBorderYellow", icon: "storefront" },
    { text: "Analise em formato de tabela Markdown aposentadoria pública (INSS) vs. privada (PGBL/VGBL) no Brasil, considerando idade, contribuição, valor, teto, carência, tributação, flexibilidade, herança e riscos para CLT e autônomos.", borderColorThemeKey: "cardBorderBlue", icon: "trending-up" },
    {
        text: "Gere uma configuração para Google Charts (formato JSON com 'text' e 'google_chart_config') para um gráfico de barras comparando o rendimento anual simulado de R$10.000 em Poupança (0.5% a.m.), CDB 100% CDI (CDI 10% a.a.) e Tesouro Selic (Selic 10% a.a.) por 3 anos. 'google_chart_config' deve ter 'chartType' (ex: 'BarChart'), 'data' (array de arrays, primeira linha são cabeçalhos), 'options' (título, eixos, cores, etc.) e 'height' (aprox. '350px'). Use cores do tema para texto/grade e vibrantes para séries.",
        borderColorThemeKey: "warning",
        icon: "insert-chart"
    },
    { text: "Explique o conceito de inflação e como ela afeta o poder de compra dos brasileiros.", borderColorThemeKey: "cardBorderMagenta", icon: "trending-down" },
    { text: "O que é a Taxa Selic e qual seu impacto nos investimentos e no crédito no Brasil?", borderColorThemeKey: "cardBorderGreen", icon: "insights" },
    { text: "Descreva os principais indicadores econômicos do Brasil (PIB, IPCA, Selic, Dólar) e sua importância.", borderColorThemeKey: "cardBorderYellow", icon: "query-stats" },
    { text: "Como funciona o mercado de ações? Quais os riscos e potenciais retornos?", borderColorThemeKey: "cardBorderBlue", icon: "show-chart" },
    { text: "Diferencie renda fixa de renda variável, com exemplos de investimentos para cada.", borderColorThemeKey: "cardBorderMagenta", icon: "timeline" },
    { text: "O que são criptomoedas? Vale a pena investir?", borderColorThemeKey: "cardBorderGreen", icon: "currency-bitcoin" },
    { text: "Como criar um planejamento financeiro pessoal eficaz em 5 passos?", borderColorThemeKey: "cardBorderYellow", icon: "edit-document" },
    { text: "Explique o que é FGC (Fundo Garantidor de Créditos) e quais investimentos ele cobre.", borderColorThemeKey: "cardBorderBlue", icon: "verified-user" },
    { text: "Quais são os principais tipos de impostos sobre investimentos no Brasil?", borderColorThemeKey: "cardBorderMagenta", icon: "receipt-long" },
    { text: "Como a política fiscal do governo afeta a economia e meus investimentos?", borderColorThemeKey: "cardBorderGreen", icon: "domain" },
    { text: "O que é diversificação de investimentos e por que ela é importante?", borderColorThemeKey: "cardBorderYellow", icon: "account-tree" },
    { text: "Quais as vantagens e desvantagens de investir em imóveis?", borderColorThemeKey: "cardBorderBlue", icon: "real-estate-agent" },
    { text: "Explique o conceito de juros compostos e como usá-los a seu favor.", borderColorThemeKey: "cardBorderMagenta", icon: "functions" },
    { text: "Como a taxa de câmbio (dólar) impacta a inflação e os investimentos no Brasil?", borderColorThemeKey: "cardBorderGreen", icon: "attach-money" },
    { text: "O que é um fundo de investimento? Quais tipos existem?", borderColorThemeKey: "cardBorderYellow", icon: "savings" },
    { text: "Quais são as melhores estratégias para quitar dívidas rapidamente?", borderColorThemeKey: "cardBorderBlue", icon: "credit-card-off" },
    { text: "Como a inteligência artificial está transformando o setor financeiro?", borderColorThemeKey: "cardBorderMagenta", icon: "auto-graph" },
    { text: "O que é ESG e como isso se aplica a investimentos financeiros?", borderColorThemeKey: "cardBorderGreen", icon: "eco" },
    { text: "Explique a diferença entre preço e valor de um ativo financeiro.", borderColorThemeKey: "cardBorderYellow", icon: "lightbulb-outline" },
    { text: "Quais os desafios econômicos do Brasil para os próximos anos?", borderColorThemeKey: "cardBorderBlue", icon: "analytics" },
    { text: "Como se proteger de golpes financeiros e fraudes online?", borderColorThemeKey: "cardBorderMagenta", icon: "security" },
];


const AI_MODELS_DISPLAY = {
    "gemini-2.5-pro-preview-05-06": "Gemini 2.5 Pro (Preview)",
    "gemini-2.0-flash": "Gemini 2.0 Flash",
    "gemini-1.5-flash": "Gemini 1.5 Flash",
    "gemini-1.5-pro": "Gemini 1.5 Pro",
};
const GEMINI_MODEL_MAPPING = {
    "WalkerTECH_Pro_Max": "gemini-2.5-pro-preview-05-06",
    "WalkerTECH_Pro": "gemini-2.0-flash",
    "WalkerTECH_1.5_Flash": "gemini-1.5-flash",
    "WalkerTECH_Compact": "gemini-1.5-pro",
};
const DEFAULT_MODEL_KEY = "WalkerTECH_1.5_Flash";

const MAX_FILE_SIZE_MB = 25;
const MAX_HISTORY_ITEMS = 20;
const NUM_SUGGESTIONS_TO_DISPLAY = 4;
const MAX_ATTACHED_FILES = 5;


let genAI;

// Gemini Tools for Function Calling (Web Search)
const tools = [{
    functionDeclarations: [
        {
            name: "perform_web_search",
            description: "Realiza uma busca na web para encontrar informações atualizadas, dados específicos ou verificar fatos. Use esta ferramenta quando a consulta do usuário exigir conhecimento além dos seus dados de treinamento ou precisar de informações sobre eventos atuais.",
            parameters: {
                type: "OBJECT",
                properties: {
                    query: {
                        type: "STRING",
                        description: "A consulta de busca para encontrar informações na web."
                    }
                },
                required: ["query"]
            }
        }
    ]
}];

// --- GoogleChartDisplay Component (for Web) ---
const GoogleChartDisplay = ({ chartConfig, themeMode }) => {
    const currentThemeColors = themes[themeMode];

    if (Platform.OS === 'web') {
        if (!Chart) {
            return <Text style={{color: currentThemeColors.textSecondary, padding: 20, textAlign: 'center', fontFamily: 'JetBrainsMono-Regular'}}>Google Charts indisponível (biblioteca não carregada).</Text>;
        }
        if (!chartConfig || !chartConfig.data || chartConfig.data.length < 2 || !chartConfig.chartType) { // Data needs at least headers and one data row
            return <Text style={{color: currentThemeColors.textSecondary, padding: 20, textAlign: 'center', fontFamily: 'JetBrainsMono-Regular'}}>Dados insuficientes ou mal formatados para exibir o gráfico (Google Charts).</Text>;
        }

        const adaptedOptions = {
            ...(chartConfig.options || {}),
            backgroundColor: 'transparent',
            titleTextStyle: {
                ...(chartConfig.options?.titleTextStyle || {}),
                color: currentThemeColors.textPrimary,
                fontName: 'JetBrainsMono-Regular',
            },
            legend: {
                ...(chartConfig.options?.legend || {}),
                textStyle: {
                    ...(chartConfig.options?.legend?.textStyle || {}),
                    color: currentThemeColors.textPrimary,
                    fontName: 'JetBrainsMono-Regular',
                },
            },
            hAxis: {
                ...(chartConfig.options?.hAxis || {}),
                textStyle: {
                    ...(chartConfig.options?.hAxis?.textStyle || {}),
                    color: currentThemeColors.textSecondary,
                    fontName: 'JetBrainsMono-Regular',
                },
                titleTextStyle: {
                    ...(chartConfig.options?.hAxis?.titleTextStyle || {}),
                    color: currentThemeColors.textPrimary,
                    fontName: 'JetBrainsMono-Regular',
                },
                gridlines: {
                    ...(chartConfig.options?.hAxis?.gridlines || {}),
                    color: currentThemeColors.dividerColor,
                },
            },
            vAxis: {
                ...(chartConfig.options?.vAxis || {}),
                textStyle: {
                    ...(chartConfig.options?.vAxis?.textStyle || {}),
                    color: currentThemeColors.textSecondary,
                    fontName: 'JetBrainsMono-Regular',
                },
                titleTextStyle: {
                    ...(chartConfig.options?.vAxis?.titleTextStyle || {}),
                    color: currentThemeColors.textPrimary,
                    fontName: 'JetBrainsMono-Regular',
                },
                gridlines: {
                    ...(chartConfig.options?.vAxis?.gridlines || {}),
                    color: currentThemeColors.dividerColor,
                },
            },
            colors: chartConfig.options?.colors || [currentThemeColors.accentPrimary, currentThemeColors.accentSecondary, currentThemeColors.success, currentThemeColors.warning, currentThemeColors.magenta],
            chartArea: {
                ...(chartConfig.options?.chartArea || {}),
                 backgroundColor: 'transparent',
            },
            tooltip: {
                ...(chartConfig.options?.tooltip || {}),
                textStyle: {
                    ...(chartConfig.options?.tooltip?.textStyle || {}),
                    fontName: 'JetBrainsMono-Regular',
                    color: currentThemeColors.textPrimary,
                },
            }
        };

        const chartHeight = typeof chartConfig.height === 'string'
            ? chartConfig.height
            : (typeof chartConfig.height === 'number' ? `${chartConfig.height}px` : `${scale(320)}px`);

        return (
            <Chart
                width={chartConfig.width || '100%'}
                height={chartHeight}
                chartType={chartConfig.chartType}
                loader={<View style={{flex:1, justifyContent:'center', alignItems:'center', height: chartHeight}}><ActivityIndicator size="large" color={currentThemeColors.accentPrimary} /><Text style={{color: currentThemeColors.textSecondary, marginTop: 10, fontFamily: 'JetBrainsMono-Regular'}}>Carregando Gráfico...</Text></View>}
                data={chartConfig.data}
                options={adaptedOptions}
                chartWrapperParams={{ view: { columns: chartConfig.viewColumns } }}
            />
        );
    } else {
        return (
            <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(currentThemeColors.warning, 0.1), borderWidth: 1, borderColor: currentThemeColors.warning, minHeight: scale(150), borderRadius: scale(8), marginVertical: scale(10) }}>
                <MaterialIcons name="bar-chart" size={scale(30)} color={currentThemeColors.warning} />
                <Text style={{ color: currentThemeColors.textSecondary, textAlign: 'center', marginTop: 10, fontFamily: 'JetBrainsMono-Regular' }}>
                    Visualização de gráficos com Google Charts está disponível apenas na versão web.
                </Text>
            </View>
        );
    }
};


export default function WalkerTECHFinancerAI() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [chatSession, setChatSession] = useState(null);
    const [currentView, setCurrentView] = useState('chat');

    const [selectedBank, setSelectedBank] = useState(banksData[0]);
    const [selectedAiModelKey, setSelectedAiModelKey] = useState(DEFAULT_MODEL_KEY);
    const [enableDeepResearch, setEnableDeepResearch] = useState(false);

    const [currentFiles, setCurrentFiles] = useState([]);

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

    const [displayedSuggestions, setDisplayedSuggestions] = useState([]);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const scrollViewRef = useRef();
    const appState = useRef(AppState.currentState);
    const sidebarIconsRef = useRef([]);


    const pickRandomSuggestions = (count = NUM_SUGGESTIONS_TO_DISPLAY) => {
        if (allEconomySuggestions.length === 0) return;
        const shuffled = [...allEconomySuggestions].sort(() => 0.5 - Math.random());
        setDisplayedSuggestions(shuffled.slice(0, Math.min(count, shuffled.length)));
    };

    useEffect(() => {
        initializeApp();
        let subscription;
        if (Platform.OS !== 'web') {
            subscription = AppState.addEventListener('change', handleAppStateChange);
        }

        // Initial animation for sidebar icons if sidebar starts expanded
        if (!isSidebarCollapsed) {
            setTimeout(() => {
                sidebarIconsRef.current.forEach((ref, index) => {
                    if (ref && typeof ref.transitionTo === 'function') {
                        ref.transitionTo({ opacity: 1, translateY: 0 }, 500 + index * 100);
                    }
                });
            }, 0); // Defer to next tick to ensure refs are set
        }

        pickRandomSuggestions();
        const suggestionIntervalId = setInterval(() => {
            pickRandomSuggestions();
        }, 5 * 60 * 1000);

        return () => {
            if (Platform.OS !== 'web' && subscription) {
                subscription.remove();
            }
            clearInterval(suggestionIntervalId);
        };
    }, []); // Keep this as initial mount effect

    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    useEffect(() => {
        AsyncStorage.setItem('appTheme', themeMode);
    }, [themeMode]);

    useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [isSidebarCollapsed]);

    // Effect for sidebar icon animations when isSidebarCollapsed changes
    useEffect(() => {
        if (!isSidebarCollapsed) {
            // Sidebar is expanding or is expanded
            // Animate icons in. Initial style is set on Animatable.View.
            setTimeout(() => { // Ensure refs are available from the render
                sidebarIconsRef.current.forEach((ref, index) => {
                    if (ref && typeof ref.transitionTo === 'function') {
                        ref.transitionTo({ opacity: 1, translateY: 0 }, 300 + index * 80);
                    }
                });
            }, 50);
        } else {
            // Sidebar is collapsing or is collapsed
            // Icons are not rendered, clear the refs array.
            sidebarIconsRef.current = [];
        }
    }, [isSidebarCollapsed]);

    const showErrorToUser = (message) => {
        console.error("USER_ERROR_DISPLAY:", message);
        if (Platform.OS !== 'web') {
            alert(message);
        } else {
            console.warn("User Info/Error (Web):", message);
        }
    };

    const initializeApp = async () => {
        setIsLoading(true);
        try {
            const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

            if (!geminiApiKey || geminiApiKey === 'YOUR_API_KEY_HERE' || geminiApiKey.length < 10 || geminiApiKey === "SUA_CHAVE_GEMINI_API_AQUI") {
                 console.warn(
                    "***********************************************************************************\n" +
                    "ATENÇÃO: Chave da API Gemini (EXPO_PUBLIC_GEMINI_API_KEY) não configurada \n" +
                    "corretamente no arquivo .env ou é um valor placeholder.\n" +
                    "A funcionalidade de IA pode não operar corretamente.\n" +
                    "Verifique se o arquivo .env existe na raiz do projeto e contém a chave.\n" +
                    "***********************************************************************************"
                 );
            }

            genAI = new GoogleGenerativeAI(geminiApiKey || 'FALLBACK_INVALID_KEY_INITIALIZATION_ERROR');

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
            console.error("CRITICAL: Error initializing GoogleGenerativeAI.", error);
            showErrorToUser(`Falha crítica ao inicializar o serviço de IA. Verifique a chave de API (.env) e a conexão. Detalhes: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAppStateChange = (nextAppState) => {
        if (Platform.OS !== 'web') {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('App has come to the foreground!');
                pickRandomSuggestions();
            } else if (nextAppState.match(/inactive|background/)) {
                console.log('App has gone to the background, saving chat...');
                if (currentView === 'chat' && messages.length > 0) {
                    saveCurrentChatToHistory();
                }
            }
            appState.current = nextAppState;
        }
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
        if (!currentMessageText && currentFiles.length === 0) {
            return;
        }

        setIsLoading(true);
        setMessageInput('');

        const userMsgIdBase = `user-${Date.now()}`;
        const interactionTimestamp = Date.now();
        let newMessagesPayload = [];

        if (currentFiles.length > 0) {
            const fileNames = currentFiles.map(f => f.name).join(', ');
            newMessagesPayload.push({
                id: `${userMsgIdBase}-files-${interactionTimestamp}`,
                text: `Arquivos: ${fileNames}`,
                sender: 'user',
                timestamp: interactionTimestamp,
                fileInfo: currentFiles.map(f => ({ name: f.name, type: f.mimeType }))
            });
        }

        if (currentMessageText) {
            newMessagesPayload.push({
                id: `${userMsgIdBase}-text-${interactionTimestamp}`,
                text: currentMessageText,
                sender: 'user',
                timestamp: interactionTimestamp
            });
        }
        setMessages(prev => [...prev, ...newMessagesPayload]);

        const aiMessageId = `ai-${aiMessageIdCounter}`;
        setAiMessageIdCounter(prev => prev + 1);
        const initialAiMsg = { id: aiMessageId, text: "", sender: 'ai', isStreaming: true, timestamp: Date.now() };
        setMessages(prev => [...prev, initialAiMsg]);

        const modelNameFromKey = GEMINI_MODEL_MAPPING[selectedAiModelKey] || GEMINI_MODEL_MAPPING[DEFAULT_MODEL_KEY];
        let effectiveModelName = modelNameFromKey;
        if (!AI_MODELS_DISPLAY[effectiveModelName]) {
            console.warn(`Model ID ${effectiveModelName} from mapping key ${selectedAiModelKey} is not in AI_MODELS_DISPLAY. Falling back to default.`);
            effectiveModelName = GEMINI_MODEL_MAPPING[DEFAULT_MODEL_KEY];
            if (!AI_MODELS_DISPLAY[effectiveModelName]) {
                effectiveModelName = "gemini-1.5-flash";
                console.warn(`Default model ${GEMINI_MODEL_MAPPING[DEFAULT_MODEL_KEY]} also not in AI_MODELS_DISPLAY. Using ${effectiveModelName}.`);
            }
        }
        if (currentFiles.length > 0 || enableDeepResearch) {
            const advancedModelKey = "WalkerTECH_Pro_Max";
            const advancedModelId = GEMINI_MODEL_MAPPING[advancedModelKey];
            if (effectiveModelName !== advancedModelId && AI_MODELS_DISPLAY[advancedModelId]) {
                 console.log(`Arquivo(s) anexado(s) ou pesquisa aprofundada habilitada. Trocando modelo de ${AI_MODELS_DISPLAY[effectiveModelName] || effectiveModelName} para ${AI_MODELS_DISPLAY[advancedModelId]} para melhor suporte. Este modelo pode incorrer em custos.`);
                 effectiveModelName = advancedModelId;
            } else if (effectiveModelName !== advancedModelId && !AI_MODELS_DISPLAY[advancedModelId]) {
                console.warn(`Modelo avançado ${advancedModelId} não encontrado em AI_MODELS_DISPLAY. Mantendo ${AI_MODELS_DISPLAY[effectiveModelName] || effectiveModelName}.`);
            }
        }

        try {
            const modelConfig = {
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                ],
                generationConfig: { temperature: 0.7 }
            };
            if (enableDeepResearch) {
                modelConfig.tools = tools;
                modelConfig.toolConfig = { functionCallingConfig: { mode: FunctionCallingMode.AUTO } };
            }
            const generativeModel = genAI.getGenerativeModel({model: effectiveModelName, ...modelConfig});

            let currentChatInstance = chatSession;
            if (!currentChatInstance) {
                const sdkChatHistory = messages
                    .filter(msg => msg.id !== aiMessageId && !msg.isError && (msg.sender === 'user' || msg.sender === 'ai') && !msg.isStreaming)
                    .filter(msg => !(msg.sender === 'user' && msg.fileInfo && msg.text && msg.text.startsWith("Arquivos:")))
                    .map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }],
                    }));

                let systemInstructionText = `Você é ${APP_NAME_DISPLAY}, um assistente financeiro especializado em finanças e investimentos no Brasil. Responda em Português Brasileiro. Seja cordial e use emojis de forma sutil e apropriada para tornar a conversa mais amigável. Utilize a família de fontes 'JetBrains Mono' para formatação de código e dados tabulares quando apropriado. Quando precisar apresentar dados tabulares, formate-os como tabelas Markdown com cabeçalhos e linhas claramente definidos.`;
                if (selectedBank && selectedBank.id !== 'none') systemInstructionText += ` Contexto bancário atual: ${selectedBank.name}.`;
                if (userProfile) systemInstructionText += ` Perfil do usuário: Nome: ${userProfile.name || 'não definido'}, Plano: ${userProfile.plan || 'não definido'}.`;
                if (analysisPreferences) systemInstructionText += ` Preferências de Análise: Risco: ${analysisPreferences.risk || 'não definido'}, Horizonte de Investimento: ${analysisPreferences.horizon || 'não definido'}.`;

                const currentThemeColorsForPrompt = themes[themeMode];
                systemInstructionText += ` Se solicitado um gráfico, forneça uma estrutura JSON como esta: {"text": "Sua explicação textual sobre o gráfico...", "google_chart_config": { "chartType": "BarChart", "data": [["Cabeçalho1", "Cabeçalho2"], ["DadoA1", 10], ["DadoB1", 20]], "options": { "title": "Título do Gráfico", "backgroundColor": "transparent", "fontName": "JetBrainsMono-Regular", "titleTextStyle": {"color": "${currentThemeColorsForPrompt.textPrimary}", "fontName": "JetBrainsMono-Bold"}, "legend": {"textStyle": {"color": "${currentThemeColorsForPrompt.textPrimary}", "fontName": "JetBrainsMono-Regular"}}, "hAxis": {"textStyle": {"color": "${currentThemeColorsForPrompt.textSecondary}", "fontName": "JetBrainsMono-Regular"}, "titleTextStyle": {"color": "${currentThemeColorsForPrompt.textPrimary}", "fontName": "JetBrainsMono-Regular"}, "gridlines": {"color": "${currentThemeColorsForPrompt.dividerColor}"}}, "vAxis": {"textStyle": {"color": "${currentThemeColorsForPrompt.textSecondary}", "fontName": "JetBrainsMono-Regular"}, "titleTextStyle": {"color": "${currentThemeColorsForPrompt.textPrimary}", "fontName": "JetBrainsMono-Regular"}, "gridlines": {"color": "${currentThemeColorsForPrompt.dividerColor}"}}, "colors": ["${currentThemeColorsForPrompt.accentPrimary}", "${currentThemeColorsForPrompt.accentSecondary}", "${currentThemeColorsForPrompt.success}", "${currentThemeColorsForPrompt.warning}", "${currentThemeColorsForPrompt.magenta}"], "chartArea": {"backgroundColor": "transparent"} }, "width": "100%", "height": "350px" } }. Use cores do tema fornecidas para textos, eixos e grades (como 'gridlines.color'). Para as cores das séries (array 'colors' nas 'options'), use o conjunto de cores vibrantes fornecido. Se não houver gráfico, apenas forneça a resposta textual. Certifique-se que o JSON seja válido. O tipo 'chartType' pode ser 'BarChart', 'LineChart', 'PieChart', 'ColumnChart', etc. A propriedade 'height' define a altura do gráfico em pixels (ex: '350px' ou 350). 'fontName' deve ser 'JetBrainsMono-Regular' ou 'JetBrainsMono-Bold' onde aplicável.`;

                if (enableDeepResearch) {
                    systemInstructionText += ` O usuário habilitou pesquisa aprofundada ('enableDeepResearch' é true). Você tem uma ferramenta chamada 'perform_web_search' para buscar informações atualizadas na web. Para usá-la, você fará uma chamada de função (function call) com o nome 'perform_web_search' e um argumento 'query' contendo o termo de busca. Após a busca, você receberá os resultados para formular sua resposta. Use esta ferramenta quando precisar de dados recentes, informações específicas fora do seu conhecimento base, ou para verificar fatos. Não invente URLs ou resultados de busca.`;
                }

                currentChatInstance = generativeModel.startChat({
                    history: sdkChatHistory,
                    systemInstruction: { parts: [{ text: systemInstructionText }], role: "system" },
                });
                setChatSession(currentChatInstance);
            }

            let currentRequestParts = [];
            if (currentFiles.length > 0) {
                for (const file of currentFiles) {
                    let fileBase64;
                    let fileMimeType = file.mimeType;

                    if (Platform.OS === 'web') {
                        if (file.originalFile instanceof File) {
                            try {
                                fileBase64 = await new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        const parts = typeof reader.result === 'string' ? reader.result.split(',') : [];
                                        if (parts.length === 2) resolve(parts[1]);
                                        else reject(new Error("Formato de Data URL inválido."));
                                    };
                                    reader.onerror = reject;
                                    reader.readAsDataURL(file.originalFile);
                                });
                                if (!fileMimeType && file.originalFile.type) fileMimeType = file.originalFile.type;
                            } catch (e) {
                                console.error(`Erro ao ler arquivo ${file.name} (web):`, e);
                                showErrorToUser(`Erro ao processar o arquivo ${file.name}. Detalhe: ${e.message}`);
                                finalizeAiMessage(aiMessageId, `Falha ao ler o arquivo ${file.name}.`, true, null);
                                setCurrentFiles([]);
                                setIsLoading(false);
                                return;
                            }
                        } else if (file.uri && file.uri.startsWith('blob:')) {
                            try {
                                const response = await fetch(file.uri);
                                if (!response.ok) throw new Error(`Falha ao buscar blob: ${response.statusText}`);
                                const blob = await response.blob();
                                if (!fileMimeType && blob.type) fileMimeType = blob.type;
                                fileBase64 = await new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        const parts = typeof reader.result === 'string' ? reader.result.split(',') : [];
                                        if (parts.length === 2) resolve(parts[1]);
                                        else reject(new Error("Formato de Data URL inválido (blob)."));
                                    };
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                });
                            } catch (e) {
                                console.error(`Erro ao ler arquivo blob ${file.name} (web):`, e);
                                showErrorToUser(`Erro ao processar o arquivo blob ${file.name}. Detalhe: ${e.message}`);
                                finalizeAiMessage(aiMessageId, `Falha ao ler o arquivo blob ${file.name}.`, true, null);
                                setCurrentFiles([]);
                                setIsLoading(false);
                                return;
                            }
                        } else {
                             console.error(`Não foi possível ler o arquivo ${file.name} (web).`);
                             showErrorToUser(`Não foi possível ler o arquivo ${file.name}.`);
                             finalizeAiMessage(aiMessageId, `Falha ao carregar o arquivo ${file.name}.`, true, null);
                             setCurrentFiles([]);
                             setIsLoading(false);
                             return;
                        }
                    } else { // Native
                        try {
                            fileBase64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
                        } catch (e) {
                            console.error(`Error reading native file ${file.name}:`, e);
                            showErrorToUser(`Erro ao processar o arquivo ${file.name}. Detalhe: ${e.message}`);
                            finalizeAiMessage(aiMessageId, `Falha ao ler o arquivo ${file.name}.`, true, null);
                            setCurrentFiles([]);
                            setIsLoading(false);
                            return;
                        }
                    }

                    if (!fileMimeType) fileMimeType = 'application/octet-stream';
                    if (typeof fileBase64 !== 'string') {
                        console.error(`fileBase64 para '${file.name}' não definido.`);
                        finalizeAiMessage(aiMessageId, `Erro interno ao preparar ${file.name}.`, true, null);
                        setCurrentFiles([]);
                        setIsLoading(false);
                        return;
                    }
                    currentRequestParts.push({ inlineData: { mimeType: fileMimeType, data: fileBase64 } });
                }

                let fileContextText = `Analise este(s) arquivo(s): ${currentFiles.map(f => f.name).join(', ')}.`;
                if (currentMessageText) {
                    currentRequestParts.push({ text: `${fileContextText} ${currentMessageText}` });
                } else {
                    currentRequestParts.push({ text: fileContextText });
                }
            } else {
                 currentRequestParts.push({ text: currentMessageText || "Olá 👋" });
            }


            // eslint-disable-next-line no-constant-condition
            while (true) {
                const result = await currentChatInstance.sendMessageStream(currentRequestParts);
                let aggregatedResponseText = "";
                let functionCallEncountered = null;

                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        aggregatedResponseText += chunkText;
                        updateAiMessageStream(aiMessageId, chunkText);
                    }
                    if (chunk.candidates?.[0]?.content?.parts) {
                        for (const part of chunk.candidates[0].content.parts) {
                            if (part.functionCall) {
                                functionCallEncountered = part.functionCall;
                                break;
                            }
                        }
                    }
                    if (functionCallEncountered) break;
                }

                if (!functionCallEncountered) {
                    const aggregatedResponse = await result.response;
                    const candidate = aggregatedResponse.candidates?.[0];
                    if (candidate?.content?.parts) {
                        for (const part of candidate.content.parts) {
                            if (part.functionCall) {
                                functionCallEncountered = part.functionCall;
                                break;
                            }
                        }
                    }
                }

                if (functionCallEncountered && enableDeepResearch) {
                    const fc = functionCallEncountered;
                    if (fc.name === 'perform_web_search') {
                        const searchQuery = fc.args.query;
                        updateAiMessageStream(aiMessageId, `\n\n🔎 Buscando na web por: "${searchQuery}"...\n(Simulação - em um app real, isso seria uma busca externa)\n`);

                        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
                        const mockSearchResults = {
                            summary: `Resultados simulados para '${searchQuery}': A Taxa Selic está em X% (dado simulado). O IPCA acumulado é Y% (dado simulado). O mercado de ações mostra volatilidade (dado simulado).`,
                            details: `Esta é uma simulação. Em um aplicativo real, aqui estariam os resultados de uma busca na web por "${searchQuery}".`,
                        };

                        currentRequestParts = [{
                            functionResponse: {
                                name: 'perform_web_search',
                                response: {
                                    name: 'perform_web_search',
                                    content: mockSearchResults,
                                },
                            }
                        }];
                    } else {
                        console.warn("AI requested an unknown or unsupported function:", fc.name);
                        updateAiMessageStream(aiMessageId, `\n⚠️ A IA tentou usar uma ferramenta desconhecida ('${fc.name}'). Continuando sem ela.`);
                         currentRequestParts = [{
                            functionResponse: {
                                name: fc.name,
                                response: { name: fc.name, content: { error: "Ferramenta não implementada pelo cliente." } },
                            }
                        }];
                    }
                } else {
                    const finalResponse = await result.response;
                    let finalReplyText = "";
                    if(finalResponse.text){
                        finalReplyText = finalResponse.text();
                    } else {
                        finalReplyText = messages.find(m => m.id === aiMessageId)?.text || aggregatedResponseText;
                    }

                    let extractedGoogleChartConfig = null;
                    try {
                        const jsonRegex = /```json\s*([\s\S]*?)\s*```|({(?:[^{}]*|{(?:[^{}]*|{[^{}]*})*})*})/s;
                        const match = finalReplyText.match(jsonRegex);

                        if (match) {
                            const jsonString = match[1] || match[2];
                            const parsedJson = JSON.parse(jsonString.trim());

                            if (parsedJson && parsedJson.google_chart_config && parsedJson.google_chart_config.chartType && parsedJson.google_chart_config.data) {
                                extractedGoogleChartConfig = parsedJson.google_chart_config;
                                const textFromJSON = typeof parsedJson.text === 'string' ? parsedJson.text : null;

                                if (textFromJSON) {
                                    finalReplyText = textFromJSON;
                                } else {
                                    finalReplyText = finalReplyText.replace(jsonRegex, "\n📊 Gráfico abaixo:\n").trim();
                                    if (finalReplyText.length < 10 && extractedGoogleChartConfig) {
                                        finalReplyText = "Aqui está o gráfico solicitado: 📊";
                                    }
                                }
                                if (extractedGoogleChartConfig.height && typeof extractedGoogleChartConfig.height === 'number') {
                                     extractedGoogleChartConfig.height = `${extractedGoogleChartConfig.height}px`;
                                } else if (extractedGoogleChartConfig.height && typeof extractedGoogleChartConfig.height !== 'string') {
                                    extractedGoogleChartConfig.height = `${scale(320)}px`;
                                } else if (!extractedGoogleChartConfig.height) {
                                    extractedGoogleChartConfig.height = `${scale(320)}px`;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("AI response did not contain valid JSON for google_chart_config, or parsing failed. Using raw text. Error:", e);
                    }

                    finalizeAiMessage(aiMessageId, finalReplyText, false, extractedGoogleChartConfig);
                    if (currentFiles.length > 0) setCurrentFiles([]);
                    break;
                }
            }

        } catch (error) {
            console.error("Error sending message to Google AI:", error, error.stack);
            let errorMessage = "😕 Falha ao comunicar com a IA. Tente novamente.";
            const effectiveModelDisplayName = AI_MODELS_DISPLAY[effectiveModelName] || effectiveModelName;

            if (error.message) errorMessage = `Erro: ${error.message}`;
            if (error.toString().includes("API key not valid")) errorMessage = "🔑 Chave de API inválida. Verifique a chave configurada no .env (EXPO_PUBLIC_GEMINI_API_KEY).";
            else if (error.toString().includes("billing account")) errorMessage = "💳 Problema com a conta de faturamento do Google Cloud. Modelos Pro como 'gemini-2.5-pro-preview' exigem faturamento habilitado.";
            else if (error.toString().includes("quota") || error.toString().includes("doesn't have a free quota tier")) {
                errorMessage = `🚦 Cota de API excedida ou modelo (${effectiveModelDisplayName}) sem cota gratuita. Verifique seu plano e uso no Google AI Studio/Cloud Console. Detalhes: ${error.message}`;
            }
            else if (error.response?.promptFeedback?.blockReason) {
                 errorMessage = `Conteúdo bloqueado pela IA. Razão: ${error.response.promptFeedback.blockReason}`;
            } else if (error.response?.candidates?.[0]?.finishReason === "SAFETY") {
                 errorMessage = "Conteúdo bloqueado pela IA devido a políticas de segurança. 🛡️";
            } else if (error.response?.candidates?.[0]?.finishReason && error.response.candidates[0].finishReason !== "STOP") {
                errorMessage = `Resposta da IA interrompida (${error.response.candidates[0].finishReason}). Tente refinar sua pergunta.`;
            }
            finalizeAiMessage(aiMessageId, errorMessage, true, null);
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

    const finalizeAiMessage = (id, finalText, isError = false, chartConfig = null) => {
        setMessages(prevMessages =>
            prevMessages.map(msg => {
                if (msg.id === id) {
                    return { ...msg, text: finalText ?? (msg.text || ""), isError, isStreaming: false, google_chart_config: chartConfig };
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
        setCurrentFiles([]);
        pickRandomSuggestions();
        await generateNewClientSessionId();
        setChatSession(null);
        showView('chat');
    };

    const toggleTheme = () => {
        setThemeMode(prevMode => prevMode === 'dark' ? 'light' : 'dark');
    };

    const onAttachFilePress = async () => {
        if (currentFiles.length >= MAX_ATTACHED_FILES) {
            showErrorToUser(`Você pode anexar no máximo ${MAX_ATTACHED_FILES} arquivos. 📎`);
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'image/*', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
                    'application/zip', 'application/x-zip-compressed',
                ],
                copyToCacheDirectory: Platform.OS !== 'web',
            });

            if (result.canceled === false && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.size && asset.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    showErrorToUser(`Arquivo "${asset.name}" muito grande. Máximo: ${MAX_FILE_SIZE_MB}MB. 😥`);
                    return;
                }
                if (currentFiles.find(f => f.name === asset.name && f.size === asset.size)) {
                    showErrorToUser(`Arquivo "${asset.name}" já foi adicionado.`);
                    return;
                }

                const newFile = {
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType || (Platform.OS === 'web' && asset.file ? asset.file.type : 'application/octet-stream'),
                    size: asset.size,
                    ...(Platform.OS === 'web' && asset.file && { originalFile: asset.file })
                };
                setCurrentFiles(prevFiles => [...prevFiles, newFile]);
                console.log("Arquivo adicionado:", newFile.name, "Total:", currentFiles.length + 1);
            }
        } catch (err) {
            console.warn("Erro ao selecionar arquivo:", err);
            showErrorToUser("Erro ao selecionar arquivo. 📂");
        }
    };

    const removeFile = (fileIndex) => {
        setCurrentFiles(prevFiles => prevFiles.filter((_, index) => index !== fileIndex));
    };

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
            showErrorToUser("Configurações salvas! 👍");
            if (closeModal) setAppNameDropdownVisible(false);
            setChatSession(null);
            console.log("App settings saved, chat session will be restarted on next message.");
        } catch (e) { console.error("Failed to save app settings", e); showErrorToUser("Erro ao salvar configurações. 💾");}
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
            showErrorToUser("Perfil salvo! 👤");
            setChatSession(null);
        } catch (e) { console.error("Failed to save user profile", e); showErrorToUser("Erro ao salvar perfil. 💾"); }
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
            showErrorToUser("Preferências salvas! 📊");
            setChatSession(null);
        } catch (e) { console.error("Failed to save analysis preferences", e); showErrorToUser("Erro ao salvar preferências. 💾"); }
    };

    const saveCurrentChatToHistory = async () => {
        if (messages.length > 0 && currentSessionId) {
            const messagesToSave = messages.filter(m => {
                if (m.sender === 'ai' && m.isStreaming && !m.text) return false;
                return true;
            }).map(m => ({ ...m, isStreaming: false }));

            if (messagesToSave.length === 0 && !messages.find(m => m.sender === 'user' && (m.text || (m.fileInfo && m.fileInfo.length > 0)))) {
                return;
            }

            let historyStore = JSON.parse(await AsyncStorage.getItem('chatHistory') || '[]');
            const firstUserMessageWithText = messagesToSave.find(m => m.sender === 'user' && m.text && !(m.fileInfo && m.text.startsWith("Arquivos:")));
            const firstUserFileMessage = messagesToSave.find(m => m.sender === 'user' && m.fileInfo && m.fileInfo.length > 0);

            let chatTitle = `Chat de ${new Date().toLocaleTimeString()}`;
            if (firstUserMessageWithText) {
                chatTitle = firstUserMessageWithText.text.substring(0, 35) + (firstUserMessageWithText.text.length > 35 ? '...' : '');
            } else if (firstUserFileMessage && firstUserFileMessage.fileInfo[0]) {
                 chatTitle = `Chat com ${firstUserFileMessage.fileInfo[0].name.substring(0, 25)}...`;
            }


            const chatEntry = {
                id: currentSessionId,
                title: chatTitle,
                date: new Date().toISOString(),
                messages: messagesToSave,
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
        setCurrentFiles([]);
        pickRandomSuggestions();
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
        if (currentView === 'history' || messages.length > 0) {
             handleNewChat(currentView !== 'history');
        }
        showErrorToUser("Histórico de chats apagado. 🗑️");
    };

    const renderMessageItem = ({ item, index }) => {
        const isUser = item.sender === 'user';
        const currentColors = themes[themeMode];

        const markdownStyles = {
            body: { color: isUser ? currentColors.messageUserText : currentColors.messageAiText, fontSize: scaleFont(16), lineHeight: scaleFont(25), fontFamily: 'JetBrainsMono-Regular' },
            link: { color: currentColors.accentSecondary, textDecorationLine: 'underline', fontWeight: 'bold', fontFamily: 'JetBrainsMono-Bold' },
            heading1: { color: isUser ? currentColors.messageUserText : currentColors.accentPrimary, fontWeight: 'bold', fontSize: scaleFont(26), marginTop:scale(18), marginBottom:scale(10), borderBottomWidth:2, borderColor: currentColors.dividerColor, paddingBottom: scale(8), fontFamily: 'JetBrainsMono-Bold'},
            heading2: { color: isUser ? currentColors.messageUserText : currentColors.textPrimary, fontWeight: 'bold', fontSize: scaleFont(22), marginTop:scale(16), marginBottom:scale(8), borderBottomWidth:1, borderColor: currentColors.dividerColor, paddingBottom: scale(6), fontFamily: 'JetBrainsMono-Bold'},
            heading3: { color: isUser ? currentColors.messageUserText : currentColors.textPrimary, fontWeight: '600', fontSize: scaleFont(19), marginTop:scale(14), marginBottom:scale(6), fontFamily: 'JetBrainsMono-Bold'},
            heading4: { color: isUser ? currentColors.messageUserText : currentColors.textPrimary, fontWeight: '600', fontSize: scaleFont(17), marginTop:scale(12), marginBottom:scale(5), fontFamily: 'JetBrainsMono-Bold'},
            heading5: { color: isUser ? currentColors.messageUserText : currentColors.textSecondary, fontWeight: '600', fontSize: scaleFont(16), marginTop:scale(10), marginBottom:scale(4), fontFamily: 'JetBrainsMono-Bold'},
            heading6: { color: isUser ? currentColors.messageUserText : currentColors.textSecondary, fontWeight: '600', fontSize: scaleFont(15), marginTop:scale(8), marginBottom:scale(3), fontFamily: 'JetBrainsMono-Bold'},
            code_inline: { backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : currentColors.bgElevation1, paddingHorizontal: scale(6), paddingVertical: scale(3), borderRadius: scale(6), fontFamily: 'JetBrainsMono-Regular', fontSize: scaleFont(14.5) },
            code_block: { backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : currentColors.bgElevation1, padding: scale(14), borderRadius: scale(8), fontFamily: 'JetBrainsMono-Regular', marginVertical: scale(10), fontSize: scaleFont(14.5), borderWidth: 1, borderColor: currentColors.borderColor },
            table: { borderColor: currentColors.borderColor, borderWidth: 1, borderRadius: scale(8), marginVertical: scale(14), overflow: 'hidden'},
            thead: {},
            th: { flex: 1, backgroundColor: currentColors.bgTertiary, padding: scale(10), color: currentColors.textPrimary, fontWeight: 'bold', fontFamily: 'JetBrainsMono-Bold', textAlign: 'left'},
            tbody: {},
            tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: currentColors.dividerColor},
            td: { flex: 1, padding: scale(10), color: currentColors.textPrimary, fontFamily: 'JetBrainsMono-Regular', textAlign: 'left'},
            list_item: { marginVertical: scale(5), flexDirection: 'row', alignItems: 'flex-start'},
            bullet_list_icon: { marginRight: scale(10), color: currentColors.accentPrimary, fontSize: Platform.OS === 'ios' ? scaleFont(12) : scaleFont(18), lineHeight: scaleFont(25), fontWeight: 'bold' },
            ordered_list_icon: { marginRight: scale(10), color: currentColors.accentPrimary, fontSize: scaleFont(16), lineHeight: scaleFont(25), fontFamily: 'JetBrainsMono-Bold' },
            strong: {fontFamily: 'JetBrainsMono-Bold', fontWeight: 'bold'},
            em: {fontFamily: 'JetBrainsMono-Regular', fontStyle: 'italic'},
            blockquote: { backgroundColor: currentColors.bgTertiary, paddingHorizontal: scale(15), paddingVertical: scale(12), marginVertical: scale(10), borderLeftWidth: scale(5), borderLeftColor: currentColors.accentPrimary, borderRadius: scale(6)},
            hr: { backgroundColor: currentColors.dividerColor, height: 1, marginVertical: scale(15) },
            image: { marginVertical: scale(10), borderRadius: scale(8), maxWidth: '100%' },
        };

        const messageContainerStyle = [
            styles.messageBubbleBase(currentColors),
            isUser ? styles.userMessageBubble(currentColors) : styles.aiMessageBubble(currentColors),
            item.isError ? styles.errorMessageBubble(currentColors) : {}
        ];
        
        const gradientColorsUser = themeMode === 'dark' ? [colors.messageUserBg, hexToRgba(colors.messageUserBg, 0.7)] : [colors.messageUserBg,  hexToRgba(colors.messageUserBg, 0.85)];
        const gradientColorsAi = themeMode === 'dark' ? [colors.messageAiBg, hexToRgba(colors.messageAiBg, 0.7)] : [colors.messageAiBg,  hexToRgba(colors.messageAiBg, 0.9)];

        return (
            <Animatable.View
                animation="fadeInUp"
                duration={400}
                delay={index < 5 ? index * 60 : 0}
                useNativeDriver={Platform.OS !== 'web'}
                style={messageContainerStyle}
            >
                <LinearGradient
                    colors={isUser ? gradientColorsUser : gradientColorsAi}
                    style={styles.messageBubbleGradient(currentColors, isUser)}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        {!isUser && <MaterialCommunityIcons name="robot-happy-outline" size={scale(24)} color={currentColors.accentPrimary} style={{ marginRight: scale(10), marginTop: scale(3) }} />}
                        <View style={{ flex: 1 }}>
                            {(() => {
                                const actualTextContent = (typeof item.text === 'string') ? item.text : '';
                                const showStreamingCursor = item.isStreaming && !item.isError && item.sender === 'ai';

                                if (actualTextContent.length > 0 || showStreamingCursor) {
                                    return (
                                        <Markdown style={markdownStyles} onLinkPress={(url) => { Linking.openURL(url); return false; }}>
                                            {actualTextContent + (showStreamingCursor ? '▍' : '')}
                                        </Markdown>
                                    );
                                }
                                return null;
                            })()}
                            {item.isError && (
                                <Text style={{color: currentColors.danger, marginTop: scale(6), fontStyle: 'italic', fontSize: scaleFont(14), fontFamily: 'JetBrainsMono-Regular'}}>
                                    Erro ao processar.
                                </Text>
                            )}
                        </View>
                        {isUser && <MaterialIcons name="account-circle" size={scale(24)} color={currentColors.messageUserText} style={{ marginLeft: scale(10), marginTop: scale(3) }} />}
                    </View>

                    {!isUser && item.google_chart_config && item.google_chart_config.chartType && item.google_chart_config.data && (
                         <View style={styles.chartContainer(currentColors)}>
                             <GoogleChartDisplay
                                 chartConfig={item.google_chart_config}
                                 themeMode={themeMode}
                             />
                         </View>
                     )}
                </LinearGradient>
            </Animatable.View>
        );
    };


    const renderSuggestionCard = ({ item, index }) => (
        <Animatable.View animation="zoomIn" duration={500} delay={index * 120} useNativeDriver={Platform.OS !== 'web'}>
            <TouchableOpacity
                style={styles.suggestionCardContainer(colors)}
                onPress={() => handleSuggestionSelect(item.text)}
                activeOpacity={0.75}
            >
                <LinearGradient
                    colors={colors.gradientCard}
                    style={styles.suggestionCardGradient(colors, colors[item.borderColorThemeKey] || item.borderColorThemeKey || colors.accentPrimary)}
                    start={{x:0, y:0}} end={{x:1, y:1}}
                >
                    <Text style={styles.suggestionCardText(colors)} numberOfLines={4} ellipsizeMode="tail">{item.text}</Text>
                    <View style={styles.suggestionCardIconContainer(colors, colors[item.borderColorThemeKey] || item.borderColorThemeKey || colors.accentPrimary)}>
                        <MaterialIcons name={item.icon || "help-outline"} size={scale(20)} color={colors.bgWhite} />
                    </View>
                </LinearGradient>
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
                        duration={700}
                        delay={250}
                        useNativeDriver={Platform.OS !== 'web'}
                        style={styles.initialGreetingContainer(colors)}
                    >
                        <Text style={styles.greetingMainText(colors)}>
                            Olá, <Text style={{color: colors.greetingHeader, fontWeight:'bold'}}>{userProfile.name || 'Investidor'}</Text>!
                        </Text>
                        <Text style={styles.greetingSubText(colors)}>Como posso te ajudar a prosperar hoje? ✨</Text>
                        {displayedSuggestions.length > 0 ? (
                            <View style={styles.suggestionCardsGrid}>
                                {displayedSuggestions.map((item, index) => (
                                    <View key={`suggestion-${index}`} style={styles.suggestionCardWrapper}>
                                       {renderSuggestionCard({ item, index })}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.greetingSubText(colors)}>Carregando sugestões inteligentes... 🧠</Text>
                        )}
                    </Animatable.View>
                </ScrollView>
            )}
            {messages.length > 0 && (
                <FlatList
                    ref={scrollViewRef} data={messages} renderItem={renderMessageItem}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.messagesContainer(colors)}
                    contentContainerStyle={{ paddingBottom: scale(12), paddingTop: scale(12), paddingHorizontal: scale(10) }}
                    onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                />
            )}
            {isLoading && messages.length === 0 && (
                 <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: colors.bgSecondary}}>
                    <ActivityIndicator size="large" color={colors.accentPrimary}/>
                    <Text style={{color: colors.textSecondary, marginTop:scale(18), fontSize: scaleFont(17), fontFamily: 'JetBrainsMono-Medium'}}>
                        {genAI ? "Conectando à IA... 🚀" : "Inicializando app... 🛠️"}
                    </Text>
                </View>
            )}
        </>
    );

    const renderHistoryView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={styles.panelContainer(colors)} useNativeDriver={Platform.OS !== 'web'}>
            <View style={styles.panelHeader(colors)}>
                <MaterialIcons name="history" size={scale(30)} color={colors.accentPrimary} />
                <Text style={styles.panelTitle(colors)}>Histórico de Chats</Text>
                {historyItems.length > 0 && (
                    <TouchableOpacity onPress={clearAllHistory} style={styles.clearHistoryButtonContainer(colors)} activeOpacity={0.7}>
                        <LinearGradient
                            colors={themeMode === 'dark' ? [hexToRgba(colors.danger, 0.3), hexToRgba(colors.danger, 0.15)] : [hexToRgba(colors.danger, 0.25), hexToRgba(colors.danger, 0.1)]}
                            style={styles.clearHistoryButtonGradient(colors)}
                            start={{x:0,y:0}} end={{x:1,y:1}}
                        >
                            <MaterialIcons name="delete-sweep" size={scale(24)} color={colors.danger} />
                            <Text style={styles.clearHistoryButtonText(colors)}>Limpar Tudo</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
            {historyItems.length === 0 ? (
                <Animatable.View animation="fadeInUp" delay={200} duration={500} style={styles.emptyStateContainer(colors)} useNativeDriver={Platform.OS !== 'web'}>
                    <MaterialCommunityIcons name="comment-remove-outline" size={scale(64)} color={colors.textPlaceholder} />
                    <Text style={styles.emptyStateText(colors)}>Nenhum chat salvo ainda. Comece uma nova conversa! 💬</Text>
                </Animatable.View>
            ) : (
                <FlatList
                    data={historyItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <Animatable.View animation="fadeInUp" duration={350} delay={index * 80} useNativeDriver={Platform.OS !== 'web'}>
                            <TouchableOpacity style={styles.historyListItemContainer(colors)} onPress={() => loadChatFromHistory(item)} activeOpacity={0.7}>
                                <LinearGradient colors={colors.gradientCard} style={styles.historyListItemGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                                    <View style={{flex:1}}>
                                        <Text style={styles.historyItemTitle(colors)} numberOfLines={1}>{item.title}</Text>
                                        <Text style={styles.historyItemDate(colors)}>{new Date(item.date).toLocaleString()}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => deleteHistoryItem(item.id)} style={{padding:scale(10)}} activeOpacity={0.7}>
                                        <MaterialIcons name="delete-outline" size={scale(26)} color={colors.danger} />
                                    </TouchableOpacity>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animatable.View>
                    )}
                    contentContainerStyle={{ paddingBottom: scale(25), paddingHorizontal: scale(22) }}
                />
            )}
        </Animatable.View>
    );

    const renderSettingsView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={{flex:1}} useNativeDriver={Platform.OS !== 'web'}>
            <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
                <View style={styles.panelHeader(colors, true)}>
                    <MaterialIcons name="settings-applications" size={scale(32)} color={colors.accentPrimary} />
                    <Text style={styles.panelTitle(colors)}>Configurações Avançadas</Text>
                </View>

                <Animatable.View animation="fadeInUp" delay={100} duration={400} style={styles.settingGroupContainer(colors)} useNativeDriver={Platform.OS !== 'web'}>
                    <LinearGradient colors={colors.gradientCard} style={styles.settingGroupGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                        <Text style={styles.settingGroupTitle(colors)}>Pesquisa e Análise IA</Text>
                        <View style={styles.settingItem(colors)}>
                            <MaterialIcons name="travel-explore" size={scale(26)} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                            <Text style={styles.settingLabel(colors)}>Pesquisa Web (Contexto):</Text>
                            <TouchableOpacity
                                style={[styles.checkboxBase(colors), enableDeepResearch && styles.checkboxChecked(colors)]}
                                onPress={() => setEnableDeepResearch(!enableDeepResearch)}
                                activeOpacity={0.7}
                            >
                                {enableDeepResearch && <MaterialIcons name="check" size={scale(20)} color={colors.buttonText} />}
                            </TouchableOpacity>
                        </View>
                         <Text style={styles.settingDescription(colors)}>
                            Permite que a IA use ferramentas de busca na web para informações mais recentes. (Pode usar modelos mais avançados e incorrer em custos)
                        </Text>
                    </LinearGradient>
                </Animatable.View>

                <Animatable.View animation="fadeInUp" delay={200} duration={400} useNativeDriver={Platform.OS !== 'web'}>
                     <TouchableOpacity style={styles.actionButtonContainer(colors)} onPress={() => saveAppSettings(false)} activeOpacity={0.8}>
                        <LinearGradient colors={colors.gradientButtonPrimary} style={styles.actionButtonGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                            <MaterialIcons name="save" size={scale(22)} color={colors.buttonText} style={{marginRight: scale(12)}}/>
                            <Text style={styles.actionButtonText(colors)}>Salvar Config. Pesquisa</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </Animatable.View>
    );

    const renderProfileView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={{flex:1}} useNativeDriver={Platform.OS !== 'web'}>
            <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
                 <View style={styles.panelHeader(colors, true)}>
                    <MaterialIcons name="person-outline" size={scale(32)} color={colors.accentPrimary} />
                    <Text style={styles.panelTitle(colors)}>Meu Perfil</Text>
                </View>
                <Animatable.View animation="fadeInUp" delay={100} duration={400} useNativeDriver={Platform.OS !== 'web'} style={styles.settingGroupContainer(colors)}>
                     <LinearGradient colors={colors.gradientCard} style={styles.settingGroupGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                        <Text style={styles.settingGroupTitle(colors)}>Informações Pessoais</Text>
                        <View style={styles.settingItem(colors)}>
                            <Text style={styles.settingLabel(colors)}>Nome:</Text>
                            <TextInput value={userProfile.name} onChangeText={text => setUserProfile(p => ({...p, name: text}))} style={styles.profileTextInput(colors)} placeholder="Seu nome" placeholderTextColor={colors.textPlaceholder}/>
                        </View>
                        <View style={styles.settingItem(colors)}>
                            <Text style={styles.settingLabel(colors)}>Email:</Text>
                            <TextInput value={userProfile.email} onChangeText={text => setUserProfile(p => ({...p, email: text}))} style={styles.profileTextInput(colors)} placeholder="seu@email.com" keyboardType="email-address" placeholderTextColor={colors.textPlaceholder}/>
                        </View>
                        <View style={styles.settingItem(colors, true)}>
                            <Text style={styles.settingLabel(colors)}>Plano:</Text>
                            <Text style={[styles.profileTextInput(colors), {textAlign:'right', opacity: 0.8}]}>{userProfile.plan.toUpperCase()}</Text>
                        </View>
                    </LinearGradient>
                </Animatable.View>
                <Animatable.View animation="fadeInUp" delay={150} duration={400} useNativeDriver={Platform.OS !== 'web'}>
                    <TouchableOpacity style={styles.actionButtonContainer(colors)} onPress={saveUserProfile} activeOpacity={0.8}>
                        <LinearGradient colors={colors.gradientButtonPrimary} style={styles.actionButtonGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                            <MaterialIcons name="save" size={scale(22)} color={colors.buttonText} style={{marginRight: scale(12)}}/>
                            <Text style={styles.actionButtonText(colors)}>Salvar Perfil</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </Animatable.View>
    );

    const renderPreferencesView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={{flex:1}} useNativeDriver={Platform.OS !== 'web'}>
             <ScrollView style={styles.panelScrollView(colors)} contentContainerStyle={styles.panelContent(colors)}>
                <View style={styles.panelHeader(colors, true)}>
                    <MaterialCommunityIcons name="tune-variant" size={scale(32)} color={colors.accentPrimary} />
                    <Text style={styles.panelTitle(colors)}>Preferências de Análise</Text>
                </View>
                <Animatable.View animation="fadeInUp" delay={100} duration={400} useNativeDriver={Platform.OS !== 'web'} style={styles.settingGroupContainer(colors)}>
                    <LinearGradient colors={colors.gradientCard} style={styles.settingGroupGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                        <Text style={styles.settingGroupTitle(colors)}>Perfil de Investidor</Text>
                        <View style={styles.settingItem(colors)}>
                            <Text style={styles.settingLabel(colors)}>Nível de Risco:</Text>
                             <View style={styles.pickerContainerPrefs(colors)}>
                                <Picker selectedValue={analysisPreferences.risk} onValueChange={val => setAnalysisPreferences(p => ({...p, risk: val}))} style={styles.pickerStyle(colors)} dropdownIconColor={colors.textPrimary}>
                                    <Picker.Item label="Conservador 🛡️" value="conservative" color={(Platform.OS === 'android' || Platform.OS === 'web') ? colors.textPrimary : undefined}/>
                                    <Picker.Item label="Moderado ⚖️" value="moderate" color={(Platform.OS === 'android' || Platform.OS === 'web') ? colors.textPrimary : undefined}/>
                                    <Picker.Item label="Agressivo 🚀" value="aggressive" color={(Platform.OS === 'android' || Platform.OS === 'web') ? colors.textPrimary : undefined}/>
                                </Picker>
                            </View>
                        </View>
                        <View style={styles.settingItem(colors, true)}>
                            <Text style={styles.settingLabel(colors)}>Horizonte:</Text>
                            <View style={styles.pickerContainerPrefs(colors)}>
                                <Picker selectedValue={analysisPreferences.horizon} onValueChange={val => setAnalysisPreferences(p => ({...p, horizon: val}))} style={styles.pickerStyle(colors)} dropdownIconColor={colors.textPrimary}>
                                    <Picker.Item label="Curto Prazo 🗓️" value="short" color={(Platform.OS === 'android' || Platform.OS === 'web') ? colors.textPrimary : undefined}/>
                                    <Picker.Item label="Médio Prazo 📅" value="medium" color={(Platform.OS === 'android' || Platform.OS === 'web') ? colors.textPrimary : undefined}/>
                                    <Picker.Item label="Longo Prazo ⏳" value="long" color={(Platform.OS === 'android' || Platform.OS === 'web') ? colors.textPrimary : undefined}/>
                                </Picker>
                            </View>
                        </View>
                    </LinearGradient>
                </Animatable.View>
                <Animatable.View animation="fadeInUp" delay={150} duration={400} useNativeDriver={Platform.OS !== 'web'}>
                     <TouchableOpacity style={styles.actionButtonContainer(colors)} onPress={saveAnalysisPrefs} activeOpacity={0.8}>
                        <LinearGradient colors={colors.gradientButtonPrimary} style={styles.actionButtonGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                            <MaterialIcons name="save" size={scale(22)} color={colors.buttonText} style={{marginRight: scale(12)}}/>
                            <Text style={styles.actionButtonText(colors)}>Salvar Preferências</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </Animatable.View>
    );

    const renderSidebar = () => (
        <LinearGradient colors={colors.sidebarGradient} style={styles.sidebar(colors, isSidebarCollapsed)} start={{x:0.5, y:0}} end={{x:0.5, y:1}}>
            {/* Conditionally render icons ONLY if not collapsed */}
            {!isSidebarCollapsed && [
                { icon: "menu", size: scale(30), action: () => setMenuModalVisible(true), label: "Menu Principal" },
                { icon: "add-circle-outline", size: scale(34), action: () => handleNewChat(), label: "Novo Chat" },
                { isSpacerBeforeToggle: true }, // This acts as a marker for a flex spacer
                { icon: "history", size: scale(28), action: () => showView('history'), label: "Histórico" },
                { icon: "settings", size: scale(26), action: () => showView('settings'), label: "Configurações IA" },
            ].map((item, index) => {
                if (item.isSpacerBeforeToggle) {
                    // Render a flexible spacer View if not collapsed
                    return <View key={`spacer-toggle-${index}`} style={{flex:1}} />;
                }
                return (
                    <Animatable.View
                        key={item.icon + index}
                        ref={ref => {
                            // Assign ref to the array, will be cleared on collapse
                            if (sidebarIconsRef.current) sidebarIconsRef.current[index] = ref;
                        }}
                        style={{opacity: 0, transform: [{translateY: 20}]}} // Initial animation state
                        useNativeDriver={Platform.OS !== 'web'}
                    >
                        <TouchableOpacity
                            style={styles.sidebarIconWrapper(colors)}
                            onPress={item.action}
                            accessible={true}
                            accessibilityLabel={item.label}
                            activeOpacity={0.6}
                        >
                            {item.type === "material-community" ?
                                <MaterialCommunityIcons name={item.icon} size={item.size} color={'#FFFFFF'} /> :
                                <MaterialIcons name={item.icon} size={item.size} color={'#FFFFFF'} />
                            }
                            {/* Label is only shown when not collapsed (implicitly by parent conditional and this check) */}
                            {item.label && <Text style={styles.sidebarIconLabel(colors)}>{item.label.split(' ')[0]}</Text>}
                        </TouchableOpacity>
                    </Animatable.View>
                );
            })}

            {/* Toggle button is always rendered, its position is relative to the sidebar whose width changes */}
            <TouchableOpacity
                style={styles.sidebarToggle(colors)}
                onPress={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                activeOpacity={0.7}
            >
                <MaterialIcons
                    name={isSidebarCollapsed ? "arrow-forward-ios" : "arrow-back-ios"}
                    size={scale(18)}
                    color={colors.textOnAccent}
                />
            </TouchableOpacity>
        </LinearGradient>
    );

    const renderTopBar = () => (
        <LinearGradient
            colors={colors.gradientTopBar}
            style={styles.topBar(colors)}
            start={{x:0, y:0}} end={{x:1, y:0}}
        >
            <TouchableOpacity style={styles.appNameTouchable(colors)} onPress={() => setAppNameDropdownVisible(true)} activeOpacity={0.7}>
                <View>
                    <Text style={styles.appNameText(colors)}>{APP_NAME_DISPLAY}</Text>
                    <Animatable.View
                        animation="fadeInLeft"
                        duration={800}
                        delay={300}
                        style={styles.appNameUnderline(colors)}
                        useNativeDriver={Platform.OS !== 'web'}
                    />
                </View>
                <MaterialIcons name="arrow-drop-down" size={scale(30)} color={colors.textPrimary} style={{marginLeft: scale(6)}} />
            </TouchableOpacity>
        </LinearGradient>
    );

    const renderInputArea = () => (
        <Animatable.View animation="slideInUp" duration={350} delay={100} style={styles.inputAreaContainer(colors)} useNativeDriver={Platform.OS !== 'web'}>
             {currentFiles.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filesPreviewScrollContainer(colors)}>
                    {currentFiles.map((file, index) => (
                        <Animatable.View key={index} animation="fadeIn" duration={300} style={styles.filePreviewContainer(colors)} useNativeDriver={Platform.OS !== 'web'}>
                            <MaterialIcons name={file.mimeType?.startsWith("image/") ? "image" : "insert-drive-file"} size={scale(20)} color={colors.accentPrimary} />
                            <Text style={styles.fileNamePreview(colors)} numberOfLines={1}>{file.name}</Text>
                            <TouchableOpacity onPress={() => removeFile(index)} style={{padding:scale(3)}} activeOpacity={0.6}>
                                <MaterialIcons name="close" size={scale(20)} color={colors.danger} />
                            </TouchableOpacity>
                        </Animatable.View>
                    ))}
                </ScrollView>
            )}
            <LinearGradient colors={colors.inputBorderGradient} start={{x:0, y:0.5}} end={{x:1,y:0.5}} style={styles.inputWrapperGradient(colors)}>
                <View style={styles.inputWrapper(colors)}>
                    <TouchableOpacity onPress={onAttachFilePress} style={styles.inputIconButton(colors)} disabled={isLoading || currentFiles.length >= MAX_ATTACHED_FILES} activeOpacity={0.6}>
                        <MaterialIcons name="attach-file" size={scale(28)} color={isLoading || currentFiles.length >= MAX_ATTACHED_FILES ? colors.textPlaceholder : colors.accentPrimary} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput(colors)}
                        value={messageInput}
                        onChangeText={setMessageInput}
                        placeholder="Pergunte sobre finanças..."
                        placeholderTextColor={colors.textPlaceholder}
                        multiline
                        editable={!isLoading}
                        textAlignVertical="top"
                    />
                    <TouchableOpacity
                        onPress={() => handleSendMessage()}
                        style={styles.sendButtonContainer(colors, (isLoading || (!messageInput.trim() && currentFiles.length === 0)))}
                        disabled={isLoading || (!messageInput.trim() && currentFiles.length === 0)}
                        activeOpacity={0.6}
                        >
                        <LinearGradient
                            colors={(isLoading || (!messageInput.trim() && currentFiles.length === 0)) ? [colors.iconMuted, colors.iconMuted] : colors.gradientButtonPrimary}
                            style={styles.sendButtonGradient(colors)}
                            start={{x:0,y:0}} end={{x:1,y:1}}
                        >
                        {isLoading && messages.some(m => m.isStreaming && m.sender === 'ai') ?
                            <ActivityIndicator size={Platform.OS === 'ios' ? 'small' : scale(22)} color={colors.buttonText} /> :
                            <MaterialIcons name="send" size={scale(26)} color={colors.buttonText} />}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </Animatable.View>
    );

    const renderFooter = () => (
        <View style={styles.footerContainer(colors)}>
            <Text style={styles.footerText(colors)}>WalkerTECH LLC DO BRASIL © {new Date().getFullYear()} | TODOS OS DIREITOS RESERVADOS</Text>
        </View>
    );

    const renderHamburgerMenuModal = () => (
        <Modal
            animationType="fade" transparent={true} visible={menuModalVisible}
            onRequestClose={() => setMenuModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setMenuModalVisible(false)}>
                <Animatable.View
                    animation="slideInLeft"
                    duration={400}
                    onStartShouldSetResponder={() => true}
                    useNativeDriver={Platform.OS !== 'web'}
                    style={[
                        styles.menuModalBaseContainer(colors),
                        { // Hamburger specific positioning
                            position: 'absolute',
                            left: scale(10),
                            top: Platform.OS === 'web' ? scale(10) : (Platform.OS === 'android' ? StatusBar.currentHeight + scale(10) : scale(50)),
                        }
                    ]}
                >
                    <LinearGradient
                        colors={themeMode === 'dark' ? [colors.menuBg, hexToRgba(colors.menuBg, 0.85)] : [colors.menuBg, hexToRgba(colors.menuBg, 0.95)]}
                        style={[styles.menuModalGradientLayer(colors), styles.hamburgerMenuModalDimensions(colors)]}
                        start={{x:0,y:0}} end={{x:1,y:1}}
                    >
                        <View style={styles.menuHeader(colors)}>
                            <MaterialIcons name="assessment" size={scale(30)} color={colors.accentPrimary} style={styles.menuAppIcon} />
                            <Text style={styles.menuTitle(colors)}>{APP_NAME_DISPLAY}</Text>
                        </View>
                        <TouchableOpacity style={styles.menuItem(colors, currentView === 'profile')} onPress={() => { showView('profile'); }} activeOpacity={0.7}>
                            <MaterialIcons name="account-circle" size={scale(26)} color={currentView === 'profile' ? colors.accentPrimary : colors.textPrimary} />
                            <Text style={styles.menuItemText(colors, currentView === 'profile')}>Meu Perfil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem(colors, currentView === 'preferences')} onPress={() => { showView('preferences'); }} activeOpacity={0.7}>
                            <MaterialCommunityIcons name="tune-variant" size={scale(26)} color={currentView === 'preferences' ? colors.accentPrimary : colors.textPrimary} />
                            <Text style={styles.menuItemText(colors, currentView === 'preferences')}>Preferências de Análise</Text>
                        </TouchableOpacity>
                        <View style={{flex:1}} />
                        <TouchableOpacity style={[styles.menuItem(colors), {borderTopWidth: 1, borderTopColor: colors.dividerColor, marginTop: scale(10)}]} onPress={async () => {
                            setMenuModalVisible(false);
                            await AsyncStorage.multiRemove(['appTheme', 'selectedAiModelKey', 'enableDeepResearch', 'selectedBankId', 'userProfile', 'analysisPreferences', 'chatHistory']);
                            showErrorToUser('Sessão local e dados limpos. Recarregue o aplicativo para aplicar todas as mudanças.');
                            setMessages([]); setCurrentFiles([]);
                            setUserProfile({ name: 'Investidor', email: 'investidor.pro@email.com', plan: 'pro' });
                            setAnalysisPreferences({ risk: 'moderate', horizon: 'medium' });
                            setHistoryItems([]); setSelectedBank(banksData[0]);
                            setSelectedAiModelKey(DEFAULT_MODEL_KEY); setEnableDeepResearch(false);
                            setThemeMode('light');
                            setCurrentSessionId(null); setChatSession(null);
                            pickRandomSuggestions();
                            await generateNewClientSessionId();
                            showView('chat');
                        }} activeOpacity={0.7}>
                            <MaterialIcons name="logout" size={scale(26)} color={colors.danger} />
                            <Text style={[styles.menuItemText(colors), {color: colors.danger}]}>Sair (Limpar Tudo)</Text>
                        </TouchableOpacity>
                    </LinearGradient>
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
                    animation="fadeIn" 
                    duration={300}
                    onStartShouldSetResponder={() => true} 
                    useNativeDriver={Platform.OS !== 'web'}
                    style={styles.menuModalBaseContainer(colors)} 
                >
                     <LinearGradient
                        colors={themeMode === 'dark' ? [colors.menuBg, hexToRgba(colors.menuBg, 0.85)] : [colors.menuBg, hexToRgba(colors.menuBg, 0.95)]}
                        style={[styles.menuModalGradientLayer(colors), styles.appNameDropdownModalPos(colors)]} 
                        start={{x:0,y:0}} end={{x:1,y:1}}
                    >
                        <Text style={styles.modalTitle(colors)}>Opções Rápidas ⚙️</Text>

                        <View style={styles.settingItemModal(colors)}>
                            <MaterialIcons name={themeMode === 'dark' ? "brightness-7" : "brightness-4"} size={scale(26)} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                            <Text style={styles.settingLabel(colors)}>Tema:</Text>
                            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleButtonContainer(colors)} activeOpacity={0.7}>
                                <LinearGradient colors={colors.gradientButtonPrimary} style={styles.themeToggleButtonGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                                    <Text style={styles.themeToggleButtonText(colors)}>Mudar para {themeMode === 'dark' ? 'Claro ☀️' : 'Escuro 🌙'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingItemModal(colors)}>
                            <MaterialCommunityIcons name="bank-outline" size={scale(26)} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                            <Text style={styles.settingLabel(colors)}>Banco:</Text>
                             <TouchableOpacity onPress={() => {setBankModalVisible(true); setAppNameDropdownVisible(false);}} style={styles.themeToggleButtonContainer(colors)} activeOpacity={0.7}>
                                <LinearGradient colors={colors.gradientButtonPrimary} style={styles.themeToggleButtonGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                                     <Text style={styles.themeToggleButtonText(colors)} numberOfLines={1} ellipsizeMode="tail">
                                        {selectedBank.name === 'Nenhum Banco' ? 'Selecionar Banco' : selectedBank.name}
                                     </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingItemModal(colors, true)}>
                            <MaterialCommunityIcons name="brain" size={scale(26)} color={colors.textSecondary} style={styles.settingIcon(colors)}/>
                            <Text style={styles.settingLabel(colors)}>Modelo IA:</Text>
                            <View style={styles.pickerContainerDropdown(colors)}>
                                <Picker
                                    selectedValue={selectedAiModelKey}
                                    onValueChange={(itemValue) => setSelectedAiModelKey(itemValue)}
                                    style={styles.pickerStyle(colors)}
                                    itemStyle={styles.pickerItemStyle(colors)}
                                    dropdownIconColor={colors.textPrimary}
                                    mode="dropdown"
                                >
                                    {Object.entries(GEMINI_MODEL_MAPPING).map(([key, modelId]) => (
                                        <Picker.Item
                                            key={key}
                                            label={AI_MODELS_DISPLAY[modelId] || key.replace(/_/g, ' ')}
                                            value={key}
                                            color={(Platform.OS === 'android' || Platform.OS === 'web') ? colors.textPrimary : undefined}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>
                        <TouchableOpacity style={[styles.actionButtonContainer(colors), {marginTop:scale(30)}]} onPress={() => saveAppSettings(true)} activeOpacity={0.8}>
                            <LinearGradient colors={colors.gradientButtonPrimary} style={styles.actionButtonGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                                <MaterialIcons name="check-circle-outline" size={scale(22)} color={colors.buttonText} style={{marginRight: scale(12)}}/>
                                <Text style={styles.actionButtonText(colors)}>Confirmar Opções</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animatable.View>
            </TouchableOpacity>
        </Modal>
    );

    const renderBankSelectionModal = () => (
        <Modal
            animationType="slide" transparent={true} visible={bankModalVisible}
            onRequestClose={() => setBankModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setBankModalVisible(false)}>
                <Animatable.View
                    animation="fadeInUpBig"
                    duration={400}
                    onStartShouldSetResponder={() => true}
                    useNativeDriver={Platform.OS !== 'web'}
                    style={styles.menuModalBaseContainer(colors)}
                >
                     <LinearGradient
                        colors={themeMode === 'dark' ? [colors.menuBg, hexToRgba(colors.menuBg, 0.85)] : [colors.menuBg, hexToRgba(colors.menuBg, 0.95)]}
                        style={[styles.menuModalGradientLayer(colors), styles.bankSelectionModalContent(colors)]}
                        start={{x:0,y:0}} end={{x:1,y:1}}
                    >
                        <Text style={styles.modalTitle(colors)}>Selecione um Banco 🏦</Text>
                        <FlatList
                            data={banksData}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item, index }) => (
                                <Animatable.View animation="fadeInUp" duration={300} delay={index * 60} useNativeDriver={Platform.OS !== 'web'}>
                                    <TouchableOpacity
                                        style={styles.bankListItem(colors, selectedBank.id === item.id)}
                                        onPress={() => {
                                            setSelectedBank(item);
                                            setBankModalVisible(false);
                                            setChatSession(null);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Image source={{ uri: item.logoUrl }} style={styles.bankLogo(colors)} resizeMode="contain" />
                                        <Text style={styles.bankName(colors, selectedBank.id === item.id)}>{item.name}</Text>
                                        {selectedBank.id === item.id && <MaterialIcons name="check-circle" size={scale(26)} color={colors.success} />}
                                    </TouchableOpacity>
                                </Animatable.View>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.bankListSeparator(colors)} />}
                            contentContainerStyle={{paddingBottom: scale(15)}}
                        />
                         <TouchableOpacity style={styles.actionButtonContainer(colors, true)} onPress={() => setBankModalVisible(false)} activeOpacity={0.8}>
                            <LinearGradient colors={themeMode === 'dark' ? [colors.textSecondary, colors.iconMuted] : [colors.textSecondary, colors.iconMuted]} style={styles.actionButtonGradient(colors)} start={{x:0,y:0}} end={{x:1,y:1}}>
                                <Text style={styles.actionButtonText(colors)}>Fechar</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animatable.View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : (Platform.OS === "web" ? undefined : "height")}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : (Platform.OS === 'web' ? 0 : (StatusBar.currentHeight || 0) )}
        >
            <View style={styles.appContainer(colors)}>
                <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bgPrimary} />
                <View style={styles.mainRowContainer(colors)}>
                    {renderSidebar()}
                    <View style={styles.mainContentColumn(colors, isSidebarCollapsed)}>
                        {renderTopBar()}
                        <View style={styles.chatOrViewArea(colors)}>
                            <Animatable.View key={currentView} animation="fadeIn" duration={350} style={{flex:1}} useNativeDriver={Platform.OS !== 'web'}>
                                {currentView === 'chat' && renderChatView()}
                                {currentView === 'history' && renderHistoryView()}
                                {currentView === 'settings' && renderSettingsView()}
                                {currentView === 'profile' && renderProfileView()}
                                {currentView === 'preferences' && renderPreferencesView()}
                            </Animatable.View>
                        </View>
                        {currentView === 'chat' && renderInputArea()}
                        {currentView === 'chat' && Platform.OS !== 'web' && renderFooter()}
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
    appContainer: (colors) => ({ flex: 1, backgroundColor: colors.bgPage }),
    mainRowContainer: () => ({ flex: 1, flexDirection: 'row' }),
    sidebar: (colors, isCollapsed) => ({
        width: isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + scale(20) : (Platform.OS === 'web' ? scale(20) : scale(55)),
        paddingBottom: scale(60),
        alignItems: 'center',
        ...(Platform.OS === 'web' && {
            height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100,
            transition: 'width 0.3s ease-in-out',
            boxShadow: `2px 0 10px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 0.5)}`,
        }),
        ...(Platform.OS !== 'web' && {
             shadowColor: colors.shadowColor,
             shadowOffset: { width: 2, height: 0 },
             shadowOpacity: colors.shadowOpacity * 0.5,
             shadowRadius: 5,
             elevation: 10,
        }),
        justifyContent: 'flex-start',
        overflow: 'hidden', // Hide content if width is too small during animation
    }),
    sidebarIconWrapper: (colors) => ({
        paddingVertical: scale(18),
        width: '100%',
        alignItems: 'center',
        marginBottom: scale(5),
    }),
    sidebarIconLabel: (colors) => ({
        color: colors.textOnAccent,
        fontSize: scaleFont(10),
        marginTop: scale(4),
        fontFamily: 'JetBrainsMono-Regular',
        textAlign: 'center',
    }),
    sidebarToggle: (colors) => ({
        position: 'absolute',
        bottom: scale(15),
        left: '50%', // Centered within the current sidebar width
        transform: [{ translateX: -scale(18) }], // Center the button (half of its width)
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        backgroundColor: hexToRgba(colors.accentPrimary, 0.5),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: hexToRgba(colors.textOnAccent, 0.3),
        zIndex: 10, // Ensure it's above other sidebar content if any overlap
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 2px 5px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 0.7)}`,
        } : {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colors.shadowOpacity * 0.7,
            shadowRadius: 3,
            elevation: 5,
        }),
    }),
    mainContentColumn: (colors, isSidebarCollapsed) => ({
        flex: 1,
        backgroundColor: colors.bgSecondary,
        ...(Platform.OS === 'web' && {
            marginLeft: isSidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH,
            height: '100vh', display: 'flex', flexDirection: 'column',
            transition: 'margin-left 0.3s ease-in-out',
        }),
        // For native, LayoutAnimation handles the effective marginLeft by resizing the sibling
    }),
    topBar: (colors) => ({
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: scale(22),
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + scale(18) : (Platform.OS === 'web' ? scale(18) : scale(55)),
        paddingBottom: scale(18),
        minHeight: scale(75),
        borderBottomWidth: 1,
        borderBottomColor: colors.dividerColor,
        ...(Platform.OS === 'web' && {
            position: 'sticky', top: 0, zIndex: 90, width: '100%',
            boxShadow: `0 2px 8px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 0.7)}`,
        }),
         ...(Platform.OS !== 'web' && {
             shadowColor: colors.shadowColor,
             shadowOffset: { width: 0, height: 2 },
             shadowOpacity: colors.shadowOpacity * 0.7,
             shadowRadius: 4,
             elevation: 7,
        }),
    }),
    appNameTouchable: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(5),
    }),
    appNameText: (colors) => ({
        fontSize: scaleFont(20),
        fontWeight: 'bold',
        color: colors.textPrimary,
        fontFamily: 'JetBrainsMono-Bold',
    }),
    appNameUnderline: (colors) => ({
        height: scale(3),
        backgroundColor: colors.appNameUnderline,
        marginTop: scale(3),
        borderRadius: scale(3),
        width: '70%',
    }),
    chatOrViewArea: (colors) => ({
        flex: 1,
        backgroundColor: colors.bgSecondary,
        ...(Platform.OS === 'web' && { display: 'flex', flexDirection: 'column', overflowY: 'hidden' })
    }),

    messagesContainer: (colors) => ({
        flex: 1,
        backgroundColor: colors.bgSecondary,
        ...(Platform.OS === 'web' && { overflowY: 'auto', flexGrow: 1 })
    }),
    messageBubbleBase: (colors) => ({
        maxWidth: '88%',
        marginVertical: scale(7),
        borderRadius: scale(22),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0px ${scale(4)}px ${scale(7)}px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 1.2)}`,
        } : {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: scale(4) },
            shadowOpacity: colors.shadowOpacity * 1.2,
            shadowRadius: scale(7),
            elevation: 6,
        }),
    }),
    messageBubbleGradient: (colors, isUser) => ({
        paddingVertical: scale(14),
        paddingHorizontal: scale(18),
        borderRadius: scale(22),
        borderBottomRightRadius: isUser ? scale(6) : scale(22),
        borderBottomLeftRadius: isUser ? scale(22) : scale(6),
    }),
    userMessageBubble: (colors) => ({
        alignSelf: 'flex-end',
        marginRight:scale(10),
    }),
    aiMessageBubble: (colors) => ({
        alignSelf: 'flex-start',
        marginLeft:scale(10),
    }),
    errorMessageBubble: (colors) => ({
        borderColor: colors.danger,
        borderWidth: 1.5,
    }),
    chartContainer: (colors) => ({
        marginTop: scale(15),
        width: '100%',
        minHeight: scale(220),
        borderWidth: Platform.OS === 'web' ? 0 : 1,
        borderColor: colors.dividerColor,
        borderRadius: scale(14),
        overflow: 'hidden',
        backgroundColor: Platform.OS === 'web' ? 'transparent' : colors.bgCard,
        padding: Platform.OS === 'web' ? 0 : scale(5),
        ...(Platform.OS === 'web' ? {
             boxShadow: `0px ${scale(3)}px ${scale(5)}px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 0.8)}`,
        } : {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colors.shadowOpacity * 0.8,
            shadowRadius: scale(4),
            elevation: 4,
        }),
    }),

    initialGreetingScrollViewContainer: (colors) => ({
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        paddingBottom: scale(35),
        paddingHorizontal: scale(10),
        ...(Platform.OS === 'web' && { width: '100%', flex: 1 })
    }),
    initialGreetingContainer: () => ({
        alignItems: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: scale(25),
        width: '100%',
        maxWidth: scale(800),
    }),
    greetingMainText: (colors) => ({
        fontSize: scaleFont(screenWidth > 400 ? 44 : 38), // screenWidth here is the raw Dimensions.get, not scaled
        fontWeight: '300',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: scale(10),
        fontFamily: 'JetBrainsMono-Light',
        lineHeight: scaleFont(screenWidth > 400 ? 52 : 46),
        ...(Platform.OS === 'web' && { textShadow: `0 1px 3px ${hexToRgba(colors.shadowColor, 0.35)}`}),
        ...(Platform.OS !== 'web' && {
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
            textShadowColor: hexToRgba(colors.shadowColor, 0.35),
        }),
    }),
    greetingSubText: (colors) => ({
        fontSize: scaleFont(screenWidth > 400 ? 21 : 19), // screenWidth here is the raw Dimensions.get, not scaled
        fontWeight: '400',
        color: colors.textSecondary,
        marginTop: scale(5),
        marginBottom: scale(35),
        textAlign: 'center',
        fontFamily: 'JetBrainsMono-Regular',
        lineHeight: scaleFont(screenWidth > 400 ? 28 : 26),
    }),
    suggestionCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '100%',
    },
    suggestionCardWrapper: {
        margin: scale(8),
    },
    suggestionCardContainer: (colors) => ({
        borderRadius: scale(18),
        width: scale(180),
        height: scale(180),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0px ${scale(5)}px ${scale(10)}px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 1.3)}`,
            transition: 'transform 0.2s ease-in-out, boxShadow 0.2s ease-in-out',
            cursor: 'pointer',
        } : {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: scale(5) },
            shadowOpacity: colors.shadowOpacity * 1.3,
            shadowRadius: scale(10),
            elevation: 8,
        }),
    }),
    suggestionCardGradient: (colors, borderColor) => ({
        borderRadius: scale(18),
        padding: scale(18),
        borderWidth: scale(2.5),
        borderColor: borderColor,
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '100%',
        height: '100%',
        justifyContent: 'space-between',
    }),
    suggestionCardText: (colors) => ({
        fontSize: scaleFont(15.5),
        fontWeight: '500',
        color: colors.textPrimary,
        fontFamily: 'JetBrainsMono-Medium',
        lineHeight: scaleFont(21),
        marginBottom: scale(10),
    }),
    suggestionCardIconContainer: (colors, iconBgColor) => ({
        padding: scale(10),
        borderRadius: scale(22),
        backgroundColor: iconBgColor,
        alignSelf: 'flex-end',
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 3px 6px ${hexToRgba(iconBgColor, 0.6)}`,
        } : {
            shadowColor: iconBgColor,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 4,
        }),
    }),

    inputAreaContainer: (colors) => ({
        paddingHorizontal: scale(18),
        paddingTop: scale(12),
        paddingBottom: Platform.OS === 'ios' ? scale(30) : (Platform.OS === 'web' ? scale(18) : scale(12)),
        backgroundColor: colors.bgInputArea,
        borderTopWidth: 1,
        borderTopColor: colors.dividerColor,
        ...(Platform.OS === 'web' && { width: '100%' }),
    }),
    filesPreviewScrollContainer: (colors) => ({
        paddingVertical: scale(8),
        marginBottom: scale(8),
    }),
    filePreviewContainer: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal:scale(12),
        paddingVertical:scale(8),
        backgroundColor:colors.bgTertiary,
        borderRadius:scale(18),
        marginRight: scale(8),
        borderWidth:1,
        borderColor:colors.borderColor,
        ...(Platform.OS === 'web' ? {
            boxShadow: `0px 1px 2px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 0.5)}`,
        } : {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: colors.shadowOpacity * 0.5,
            shadowRadius: 2,
            elevation: 1,
        }),
    }),
    fileNamePreview: (colors) => ({
        flexShrink:1,
        maxWidth: scale(120),
        marginLeft:scale(8),
        marginRight:scale(8),
        color:colors.textSecondary,
        fontSize:scaleFont(13.5),
        fontFamily: 'JetBrainsMono-Regular'
    }),
    inputWrapperGradient: (colors) => ({
        borderRadius: scale(32),
        padding: scale(2.5),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0px ${scale(4)}px ${scale(8)}px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 1.4)}`,
        } : {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: scale(4) },
            shadowOpacity: colors.shadowOpacity * 1.4,
            shadowRadius: scale(8),
            elevation: 7,
        }),
    }),
    inputWrapper: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: scale(30),
        paddingHorizontal: scale(10),
        minHeight: scale(60),
    }),
    textInput: (colors) => ({
        flex: 1,
        color: colors.textPrimary,
        fontSize: scaleFont(16.5),
        paddingHorizontal: scale(18),
        paddingTop: Platform.OS === 'ios' ? scale(18) : scale(14),
        paddingBottom: Platform.OS === 'ios' ? scale(18) : scale(14),
        maxHeight: scale(125),
        fontFamily: 'JetBrainsMono-Regular',
        lineHeight: scaleFont(22),
        ...(Platform.OS === 'web' && { outline: 'none', resize: 'none', width: '100%' }),
    }),
    inputIconButton: () => ({
        padding: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
    }),
    sendButtonContainer: (colors, isDisabled) => ({
        borderRadius: scale(24),
        width: scale(48), height: scale(48),
        margin: scale(5),
        opacity: isDisabled ? 0.7 : 1,
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 3px 6px ${hexToRgba(isDisabled ? colors.iconMuted : colors.accentPrimary, 0.7)}`,
        } : {
            shadowColor: isDisabled ? colors.iconMuted : colors.accentPrimary,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.7,
            shadowRadius: 4,
            elevation: 4,
        }),
    }),
    sendButtonGradient: (colors) => ({
        borderRadius: scale(24),
        width: '100%', height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    }),

    footerContainer: (colors) => ({
        paddingVertical: scale(14),
        paddingHorizontal: scale(18),
        backgroundColor: colors.bgPrimary,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.dividerColor,
        ...(Platform.OS === 'web' && { display: 'none' })
    }),
    footerText: (colors) => ({
        fontSize: scaleFont(11.5),
        color: colors.textSecondary,
        textAlign: 'center',
        fontFamily: 'JetBrainsMono-Regular',
        letterSpacing: 0.3,
    }),

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent:'center', // Default, can be overridden by specific modal positioning
        alignItems:'center',     // Default, can be overridden by specific modal positioning
        ...(Platform.OS === 'web' && { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 })
    },
    menuModalBaseContainer: (colors) => ({ // This is the container that gets the shadow and base border radius
        borderRadius: scale(20),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 ${scale(8)}px ${scale(18)}px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 1.8)}`,
        } : {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: scale(8) },
            shadowOpacity: colors.shadowOpacity * 1.8,
            shadowRadius: scale(18),
            elevation: 20,
        }),
    }),
    menuModalGradientLayer: (colors) => ({ // This is the content layer with gradient bg
        borderRadius: scale(20),
        paddingBottom: scale(15),
        overflow: 'hidden',
    }),
    hamburgerMenuModalDimensions: (colors) => ({ // Defines size and internal padding for hamburger menu content
        width: Math.min(screenWidth * 0.8, scale(300)), // screenWidth is raw
        minWidth: scale(280),
        maxHeight: screenHeight * 0.8,  // screenHeight is raw
        paddingTop: scale(15), 
    }),
    appNameDropdownModalPos: (colors) => ({ // Defines size and internal padding for app name dropdown
        maxWidth: scale(400),
        width: screenWidth > scale(450) ? scale(400) : '90%',  // screenWidth is raw
        paddingTop: scale(22),
    }),
    bankSelectionModalContent: (colors) => ({ // Defines size and internal padding for bank selection
        maxHeight: screenHeight * (Platform.OS === 'web' ? 0.9 : 0.8), // screenHeight is raw
        width: screenWidth * (IS_SMALL_SCREEN ? 0.96 : (Platform.OS === 'web' ? 0.55 : 0.92)), // screenWidth and IS_SMALL_SCREEN are available
        maxWidth: scale(Platform.OS === 'web' ? 550 : 500),
        paddingTop: scale(22),
        ...(Platform.OS === 'web' && { overflowY: 'auto' })
    }),
    menuHeader: (colors) => ({
        flexDirection: 'row',
        alignItems:'center',
        paddingHorizontal: scale(22),
        paddingVertical: scale(18),
        marginBottom: scale(18),
        borderBottomWidth:1,
        borderBottomColor: colors.dividerColor,
    }),
    menuAppIcon: { marginRight: scale(18) },
    menuTitle: (colors) => ({ fontSize: scaleFont(21), fontWeight: 'bold', color: colors.textPrimary, flexShrink:1, fontFamily: 'JetBrainsMono-Bold' }),
    menuItem: (colors, isActive = false) => ({
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: scale(16), paddingHorizontal: scale(22),
        backgroundColor: isActive ? hexToRgba(colors.accentPrimary, 0.25) : 'transparent',
        borderRadius: isActive ? scale(14) : 0,
        marginHorizontal: isActive ? scale(12) : 0,
        marginBottom: scale(6),
        borderLeftWidth: isActive ? scale(5) : 0,
        borderLeftColor: isActive ? colors.accentPrimary : 'transparent',
    }),
    menuItemText: (colors, isActive = false) => ({
        fontSize: scaleFont(16),
        color: isActive ? colors.accentPrimary : colors.textPrimary,
        marginLeft: scale(22),
        fontWeight: isActive ? 'bold' : '500',
        fontFamily: isActive ? 'JetBrainsMono-Bold' : 'JetBrainsMono-Medium',
    }),
    modalTitle: (colors) => ({ fontSize: scaleFont(23), fontWeight: 'bold', color: colors.textPrimary, marginBottom: scale(28), textAlign: 'center', paddingHorizontal:scale(18), fontFamily: 'JetBrainsMono-Bold' }),

    settingItem: (colors, noBorder = false) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scale(20), paddingHorizontal:scale(22), borderBottomWidth: noBorder ? 0 : 1, borderBottomColor: colors.dividerColor }),
    settingItemModal: (colors, noBorder = false) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scale(16), paddingHorizontal:scale(22), borderBottomWidth: noBorder ? 0 : 1, borderBottomColor: hexToRgba(colors.dividerColor, 0.7), width: '100%' }),
    settingIcon: () => ({ marginRight: scale(20) }),
    settingLabel: (colors) => ({ fontSize: scaleFont(16.5), color: colors.textPrimary, flex: 1, fontFamily: 'JetBrainsMono-Regular' }),
    themeToggleButtonContainer: (colors) => ({
        borderRadius: scale(28),
        minWidth: scale(125),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 2px 4px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 0.9)}`,
        } : {
            shadowColor: colors.shadowColor, shadowOffset: {width:0, height:2}, shadowOpacity:colors.shadowOpacity * 0.9, shadowRadius: scale(4), elevation: 3
        })
    }),
    themeToggleButtonGradient: (colors) => ({
        paddingVertical: scale(11),
        paddingHorizontal: scale(16),
        borderRadius: scale(28),
        alignItems:'center',
    }),
    themeToggleButtonText: (colors) => ({ color: colors.buttonText, fontSize: scaleFont(14.5), fontWeight: 'bold', fontFamily: 'JetBrainsMono-Bold' }),

    pickerContainerDropdown: (colors) => ({ borderWidth: 1.5, borderColor: colors.borderColor, borderRadius: scale(14), backgroundColor: colors.inputBg, justifyContent: 'center', minWidth: scale(165), maxWidth: screenWidth * (IS_SMALL_SCREEN ? 0.42 : 0.48), marginLeft: scale(12)}), // screenWidth and IS_SMALL_SCREEN are available
    pickerContainerPrefs: (colors) => ({ borderWidth: 1.5, borderColor: colors.borderColor, borderRadius: scale(14), backgroundColor: colors.inputBg, justifyContent: 'center', flex: 1, marginLeft: scale(14)}),
    pickerStyle: (colors) => ({
        height: scale(54),
        color: colors.textPrimary,
        width:'100%',
        fontSize: scaleFont(15.5),
        fontFamily: 'JetBrainsMono-Regular',
        ...(Platform.OS === 'web' && { border: 'none', background: 'transparent', paddingLeft: 12, paddingRight: 12, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor:'pointer' })
    }),
    pickerItemStyle: (colors) => ({
        color: colors.textPrimary,
        fontSize: scaleFont(16.5),
        fontFamily: 'JetBrainsMono-Regular',
        ...(Platform.OS === 'web' && { backgroundColor: colors.menuBg })
    }),

    checkboxBase: (colors) => ({ width: scale(30), height: scale(30), justifyContent: 'center', alignItems: 'center', borderRadius: scale(10), borderWidth: 2.5, borderColor: colors.accentPrimary, backgroundColor: colors.inputBg, marginLeft: scale(14) }),
    checkboxChecked: (colors) => ({ backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }),
    actionButtonContainer: (colors, isSecondaryLook = false) => ({
        borderRadius: scale(100),
        alignSelf: 'center',
        marginTop:scale(38),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 ${scale(5)}px ${scale(8)}px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 1.1)}`,
        } : {
            shadowColor: colors.shadowColor, shadowOffset:{width:0,height:scale(5)}, shadowOpacity:colors.shadowOpacity*1.1, shadowRadius:scale(8), elevation:7
        })
    }),
    actionButtonGradient: (colors) => ({
        paddingVertical: scale(18),
        paddingHorizontal: scale(38),
        borderRadius: scale(100),
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    }),
    actionButtonText: (colors) => ({ color: colors.buttonText, fontSize: scaleFont(16), fontWeight: 'bold', fontFamily: 'JetBrainsMono-Bold', letterSpacing: 0.2 }),

    panelContainer: (colors) => ({
        flex: 1,
        backgroundColor: colors.bgSecondary,
        ...(Platform.OS === 'web' && {
            overflowY: 'auto',
            maxHeight: '100vh',
            paddingBottom: scale(20),
            paddingTop: scale(20),
            paddingHorizontal: scale(15),
            borderTopLeftRadius: scale(20),
        })
    }),
    panelScrollView: (colors) => ({
        flex: 1,
        backgroundColor: colors.bgSecondary,
    }),
    panelContent: () => ({ paddingHorizontal: scale(22), paddingVertical: scale(12), paddingBottom: scale(45) }),
    panelHeader: (colors, centered = false) => ({
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(28),
        paddingBottom:scale(18),
        borderBottomWidth:1.5,
        borderBottomColor: colors.dividerColor,
        justifyContent: centered ? 'center' : 'flex-start',
        paddingHorizontal: Platform.OS === 'web' ? scale(15) : scale(22)
    }),
    panelTitle: (colors) => ({ fontSize: scaleFont(25), fontWeight: 'bold', color: colors.textPrimary, marginLeft: scale(14), flex:1, fontFamily: 'JetBrainsMono-Bold' }),

    historyListItemContainer: (colors) => ({
        borderRadius:scale(14),
        marginBottom:scale(14),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 ${scale(4)}px ${scale(6)}px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 1.1)}`,
        } : {
            shadowColor: colors.shadowColor, shadowOffset:{width:0,height:scale(4)}, shadowOpacity:colors.shadowOpacity*1.1, shadowRadius:scale(6), elevation:5
        })
    }),
    historyListItemGradient: (colors) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical:scale(16),
        paddingHorizontal:scale(20),
        borderRadius:scale(14),
    }),
    historyItemTitle: (colors) => ({ fontSize:scaleFont(16.5), fontWeight:'bold', color:colors.textPrimary, marginBottom:scale(5), fontFamily: 'JetBrainsMono-Bold' }),
    historyItemDate: (colors) => ({ fontSize:scaleFont(12.5), color:colors.textSecondary, fontFamily: 'JetBrainsMono-Regular' }),
    clearHistoryButtonContainer: (colors) => ({
        borderRadius:scale(22),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 2px 4px ${hexToRgba(colors.danger, 0.3)}`,
        } : {
            shadowColor: colors.danger, shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:3, elevation:2
        })
    }),
    clearHistoryButtonGradient: (colors) => ({
        flexDirection:'row',
        alignItems:'center',
        paddingVertical:scale(8),
        paddingHorizontal:scale(14),
        borderRadius:scale(22),
    }),
    clearHistoryButtonText: (colors) => ({ color: colors.danger, fontSize:scaleFont(13.5), marginLeft:scale(8), fontWeight:'bold', fontFamily: 'JetBrainsMono-Bold'}),
    emptyStateContainer: () => ({ flex:1, justifyContent:'center', alignItems:'center', padding:scale(25) }),
    emptyStateText: (colors) => ({ fontSize:scaleFont(17.5), color:colors.textPlaceholder, marginTop:scale(18), textAlign:'center', fontFamily: 'JetBrainsMono-Regular', lineHeight: scaleFont(25) }),

    settingGroupContainer: (colors) => ({
        marginBottom: scale(32),
        borderRadius:scale(16),
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 ${scale(4)}px ${scale(7)}px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * 1.1)}`,
        } : {
            shadowColor: colors.shadowColor, shadowOffset:{width:0,height:scale(4)}, shadowOpacity:colors.shadowOpacity*1.1, shadowRadius:scale(7), elevation:6
        })
    }),
    settingGroupGradient: (colors) => ({
        borderRadius:scale(16),
        paddingVertical:scale(12),
    }),
    settingGroupTitle: (colors) => ({ fontSize:scaleFont(15), fontWeight:'bold', color:colors.textSecondary, paddingHorizontal:scale(22), paddingTop:scale(18), paddingBottom:scale(10), textTransform:'uppercase', letterSpacing:0.3, fontFamily: 'JetBrainsMono-Bold' }),
    settingDescription: (colors) => ({
        fontSize: scaleFont(13.5),
        color: colors.textSecondary,
        fontFamily: 'JetBrainsMono-Regular',
        paddingHorizontal: scale(22),
        paddingBottom: scale(18),
        marginTop: scale(-8),
        lineHeight: scaleFont(19),
    }),
    profileTextInput: (colors) => ({
        flex:1,
        color: colors.textPrimary,
        fontSize: scaleFont(16.5),
        paddingVertical:scale(12),
        textAlign:'right',
        fontFamily: 'JetBrainsMono-Regular',
        ...(Platform.OS === 'web' && { backgroundColor: 'transparent', border: 'none', outline: 'none' })
    }),

    bankListItem: (colors, isSelected) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(16),
        paddingHorizontal: scale(20),
        borderRadius: scale(14),
        backgroundColor: isSelected ? hexToRgba(colors.accentPrimary, 0.2) : hexToRgba(colors.bgTertiary, 0.8),
        marginBottom: scale(12),
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? colors.accentPrimary : colors.borderColor,
         ...(Platform.OS === 'web' ? {
            boxShadow: `0 2px 4px ${hexToRgba(colors.shadowColor, colors.shadowOpacity * (isSelected ? 0.9 : 0.6))}`,
        } : {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colors.shadowOpacity * (isSelected ? 0.9 : 0.6),
            shadowRadius: isSelected ? 4 : 3,
            elevation: isSelected ? 4 : 2,
        }),
    }),
    bankLogo: (colors) => ({ width: scale(44), height: scale(44), borderRadius: scale(22), marginRight: scale(20), backgroundColor: colors.bgWhite, padding: scale(2), borderWidth:1, borderColor: colors.borderColor }),
    bankName: (colors, isSelected) => ({
        flex: 1,
        fontSize: scaleFont(16.5),
        color: isSelected ? colors.accentPrimary : colors.textPrimary,
        fontWeight: isSelected ? 'bold' : '500',
        fontFamily: isSelected ? 'JetBrainsMono-Bold' : 'JetBrainsMono-Medium',
    }),
    bankListSeparator: (colors) => ({ height: 1.5, backgroundColor: hexToRgba(colors.dividerColor, 0.5), marginVertical: scale(5) }),
    infoText: (colors) => ({
        color: colors.textSecondary,
        fontSize: scaleFont(14.5),
        textAlign: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: scale(15),
        fontFamily: 'JetBrainsMono-Regular',
        lineHeight: scaleFont(20),
    }),
});
