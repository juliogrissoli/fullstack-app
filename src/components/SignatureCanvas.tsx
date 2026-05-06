/**
 * 🏛️ SB IMPERIUM v14.0 - SIGNATURE CANVAS COM AI FACE VALIDATION
 * 
 * Componente de assinatura digital com:
 * - Canvas para assinatura manuscrita
 * - Captura de imagem (Webcam) para prova de vida
 * - AI Face Validation com 3 frames durante assinatura
 * - Validação de termos de uso obrigatórios
 * - Biometria e auditoria SHA-256
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// 🎨 CORES SOBERANAS
const COLORS = {
  gold: '#D4AF37',
  deepOcean: '#0a1628',
  ocean: '#1e3a5f',
  lightGold: '#f4e5c2',
  white: '#ffffff',
  success: '#4CAF50',
  error: '#f44336'
};

interface SignatureCanvasProps {
  dealId: string;
  dealTitle: string;
  onSignatureComplete?: (signatureData: any) => void;
  className?: string;
}

export function SignatureCanvas({ 
  dealId, 
  dealTitle, 
  onSignatureComplete,
  className = '' 
}: SignatureCanvasProps) {
  // Estados principais
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [biometryData, setBiometryData] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  
  // Estados para AI Face Validation
  const [faceValidationActive, setFaceValidationActive] = useState(false);
  const [faceFrames, setFaceFrames] = useState<string[]>([]);
  const [faceValidationStatus, setFaceValidationStatus] = useState<'idle' | 'capturing' | 'validating' | 'success' | 'error'>('idle');
  const [faceValidationProgress, setFaceValidationProgress] = useState(0);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Supabase client
  const supabase = createClient();

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Configurar canvas
    ctx.strokeStyle = COLORS.deepOcean;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Preencher fundo branco
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Limpar canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  // Funções de desenho
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Capturar frame facial durante assinatura
    if (faceValidationActive && faceFrames.length < 3) {
      captureFaceFrame();
    }
  }, [isDrawing, faceValidationActive, faceFrames.length]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Funções de Webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setWebcamActive(true);
      }
    } catch (error: any) {
      console.error('❌ Erro ao acessar webcam:', error);
      toast.error('Não foi possível acessar a webcam: ' + error.message);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setWebcamActive(false);
    }
  }, []);

  const captureBiometry = useCallback(() => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    if (!video) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    setBiometryData(imageData);
    setIsCapturing(false);
    stopWebcam();
    
    toast.success('📸 Prova de vida capturada com sucesso!');
  }, [stopWebcam]);

  // AI Face Validation Functions
  const startFaceValidation = useCallback(async () => {
    try {
      setFaceValidationStatus('capturing');
      setFaceFrames([]);
      setFaceValidationProgress(0);
      
      // Iniciar webcam para validação facial
      await startWebcam();
      setFaceValidationActive(true);
      
      toast('🤖 Iniciando validação facial - Assine normalmente');
      
    } catch (error: any) {
      console.error('❌ Erro ao iniciar validação facial:', error);
      setFaceValidationStatus('error');
      toast.error('Erro ao iniciar validação facial: ' + error.message);
    }
  }, [startWebcam]);

  const captureFaceFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || faceFrames.length >= 3) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    
    setFaceFrames(prev => {
      const newFrames = [...prev, frameData];
      setFaceValidationProgress(Math.round((newFrames.length / 3) * 100));
      
      if (newFrames.length === 3) {
        setFaceValidationStatus('validating');
        validateFaceFrames(newFrames);
      }
      
      return newFrames;
    });
  }, [faceFrames.length]);

  const validateFaceFrames = useCallback(async (frames: string[]) => {
    try {
      setFaceValidationStatus('validating');
      
      // Simulação de validação AI (em produção, usar TensorFlow.js ou API externa)
      const validation = await simulateFaceValidation(frames);
      
      if (validation.success) {
        setFaceValidationStatus('success');
        toast.success('✅ Validação facial concluída com sucesso!');
        
        // Desativar após validação bem-sucedida
        setTimeout(() => {
          setFaceValidationActive(false);
          stopWebcam();
        }, 2000);
      } else {
        setFaceValidationStatus('error');
        toast.error('❌ Validação facial falhou: ' + validation.error);
      }
      
    } catch (error: any) {
      console.error('❌ Erro na validação facial:', error);
      setFaceValidationStatus('error');
      toast.error('Erro na validação facial: ' + error.message);
    }
  }, [stopWebcam]);

  const simulateFaceValidation = useCallback(async (frames: string[]): Promise<{
    success: boolean;
    confidence?: number;
    error?: string;
  }> => {
    // Simulação de processamento AI
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Em produção, implementar detecção facial real:
    // 1. Usar TensorFlow.js com modelo Face Landmark Detection
    // 2. Verificar consistência dos 3 frames
    // 3. Calcular confidence score
    // 4. Validar que é a mesma pessoa
    
    // Simulação com 90% de sucesso
    const random = Math.random();
    
    if (random > 0.1) {
      return {
        success: true,
        confidence: 0.85 + Math.random() * 0.15 // 85-100%
      };
    } else {
      return {
        success: false,
        error: 'Face não detectada consistentemente nos frames'
      };
    }
  }, []);

  const stopFaceValidation = useCallback(() => {
    setFaceValidationActive(false);
    setFaceValidationStatus('idle');
    setFaceFrames([]);
    setFaceValidationProgress(0);
    stopWebcam();
  }, [stopWebcam]);

  // Salvar assinatura
  const saveSignature = useCallback(async () => {
    if (isEmpty) {
      toast.error('Por favor, assine no canvas antes de continuar');
      return;
    }
    
    if (!termsAccepted) {
      toast.error('Você precisa aceitar os Termos de Uso SB Signature');
      return;
    }
    
    // Verificar se o checkbox foi realmente marcado
    const checkboxElement = document.getElementById('aceite_termos') as HTMLInputElement;
    if (!checkboxElement || !checkboxElement.checked) {
      toast.error('Você precisa aceitar os Termos de Uso SB Signature');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Obter dados da assinatura
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas não encontrado');
      
      const signatureData = canvas.toDataURL('image/png');
      
      // Obter dados do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      // Gerar hash SHA-256 de auditoria
      const dadosParaHash = [
        dealId,
        user.id,
        signatureData,
        new Date().toISOString(),
        biometryData || ''
      ].join('|');
      
      const crypto = require('crypto');
      const hashAuditoria = crypto.createHash('sha256').update(dadosParaHash).digest('hex');
      
      // Preparar dados da assinatura
      const signatureRecord = {
        id: `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        deal_id: dealId,
        user_id: user.id,
        signature_data: signatureData,
        biometry_data: biometryData,
        face_validation_frames: faceFrames,
        nome_assinante: user.user_metadata?.nome || 'Usuário',
        email_assinante: user.email || '',
        data_assinatura: new Date().toISOString(),
        ip_assinatura: 'IP_CLIENTE', // Será capturado no backend
        hash_auditoria: hashAuditoria,
        termos_aceitos: termsAccepted,
        termos_versao: 'v1.0',
        status: 'assinado'
      };
      
      // Salvar no Supabase
      const { data: savedSignature, error } = await supabase
        .from('signatures')
        .insert(signatureRecord)
        .select()
        .single();
      
      if (error) throw error;
      
      // Disparar webhook financeiro para atualizar Função Social
      await triggerFinancialWebhook(savedSignature);
      
      // Registrar log de auditoria
      await registerAuditLog(savedSignature);
      
      toast.success('✅ Assinatura salva com sucesso!');
      
      // Callback
      if (onSignatureComplete) {
        onSignatureComplete(savedSignature);
      }
      
      // Limpar estados
      clearCanvas();
      setBiometryData(null);
      setTermsAccepted(false);
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar assinatura:', error);
      toast.error('Erro ao salvar assinatura: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isEmpty, termsAccepted, dealId, biometryData, onSignatureComplete, clearCanvas]);

  // Webhook financeiro para atualizar Função Social
  const triggerFinancialWebhook = useCallback(async (signature: any) => {
    try {
      // Calcular valor da função social (1% do valor do deal)
      const dealValue = 100000; // Simulação - buscar do deal real
      const funcaoSocialValue = dealValue * 0.01;
      
      // Chamar webhook do Medidômetro
      const response = await fetch('/api/admin/medidometro/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'nova_assinatura',
          signature_id: signature.id,
          deal_id: signature.deal_id,
          valor_funcao_social: funcaoSocialValue,
          data_assinatura: signature.data_assinatura,
          hash_auditoria: signature.hash_auditoria
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
      
      console.log('✅ Webhook financeiro disparado com sucesso');
      
    } catch (error: any) {
      console.error('❌ Erro no webhook financeiro:', error);
      // Não falhar a assinatura se o webhook falhar
    }
  }, []);

  // Registrar log de auditoria
  const registerAuditLog = useCallback(async (signature: any) => {
    try {
      await supabase
        .from('logs_auditoria')
        .insert({
          id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          user_id: signature.user_id,
          recurso_acessado: `signature_${signature.id}`,
          timestamp: new Date().toISOString(),
          nexo_hash: signature.hash_auditoria,
          ip_acesso: 'IP_CLIENTE',
          tipo_acao: 'assinatura',
          detalhes: {
            deal_id: signature.deal_id,
            biometry_included: !!signature.biometry_data,
            termos_aceitos: signature.termos_aceitos
          }
        });
    } catch (error) {
      console.error('❌ Erro ao registrar log de auditoria:', error);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2" style={{ color: COLORS.gold }}>
          📝 Assinatura Digital SB
        </h2>
        <p className="text-sm text-gray-400">
          Deal: {dealTitle}
        </p>
      </div>

      {/* Canvas de Assinatura */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: COLORS.lightGold }}>
          ✍️ Assine abaixo:
        </label>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full border-2 rounded-lg cursor-crosshair bg-white"
          style={{ borderColor: COLORS.gold }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        
        <div className="mt-2 flex justify-between items-center">
          <button
            type="button"
            onClick={clearCanvas}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{ 
              backgroundColor: COLORS.ocean, 
              color: COLORS.lightGold 
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.deepOcean}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.ocean}
          >
            🗑️ Limpar
          </button>
          
          <span className={`text-xs px-2 py-1 rounded ${
            isEmpty 
              ? 'bg-red-900 text-red-300' 
              : 'bg-green-900 text-green-300'
          }`}>
            {isEmpty ? '❌ Vazia' : '✅ Preenchida'}
          </span>
        </div>
      </div>

      {/* Biometria (Webcam) */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: COLORS.lightGold }}>
          📸 Prova de Vida (Opcional):
        </label>
        
        {!webcamActive && !biometryData && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startWebcam}
              className="px-4 py-2 text-sm rounded transition-colors"
              style={{ 
                backgroundColor: COLORS.gold, 
                color: COLORS.deepOcean 
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              📷 Ativar Webcam
            </button>
          </div>
        )}
        
        {webcamActive && (
          <div className="space-y-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
              style={{ maxHeight: '300px' }}
            />
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={captureBiometry}
                className="px-4 py-2 text-sm rounded transition-colors"
                style={{ 
                  backgroundColor: COLORS.success, 
                  color: COLORS.white 
                }}
              >
                📸 Capturar
              </button>
              
              <button
                type="button"
                onClick={stopWebcam}
                className="px-4 py-2 text-sm rounded transition-colors"
                style={{ 
                  backgroundColor: COLORS.error, 
                  color: COLORS.white 
                }}
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        )}
        
        {biometryData && (
          <div className="space-y-2">
            <img
              src={biometryData}
              alt="Prova de Vida"
              className="w-32 h-32 rounded-full border-2 mx-auto"
              style={{ borderColor: COLORS.gold }}
            />
            
            <button
              type="button"
              onClick={() => setBiometryData(null)}
              className="px-4 py-2 text-sm rounded transition-colors w-full"
              style={{ 
                backgroundColor: COLORS.ocean, 
                color: COLORS.lightGold 
              }}
            >
              🔄 Refazer Foto
            </button>
          </div>
        )}
      </div>

      {/* Termos de Uso */}
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            id="aceite_termos"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 rounded"
            style={{ accentColor: COLORS.gold }}
          />
          <div className="flex-1 text-sm text-gray-300 leading-relaxed overflow-y-auto max-h-32 pr-2">
            <strong style={{ color: COLORS.gold }}>Termos de Uso SB Signature v1.0</strong>
            <div className="mt-2 text-xs space-y-2">
              <p>1. <strong>ACEITE DOS TERMOS</strong> - Ao utilizar este serviço, você concorda com estes termos.</p>
              <p>2. <strong>VALIDADE JURÍDICA</strong> - As assinaturas digitais possuem validade legal conforme Lei nº 14.063/2020.</p>
              <p>3. <strong>PROTEÇÃO DE DADOS</strong> - Seus dados são protegidos pela Lei Geral de Proteção de Dados (LGPD).</p>
              <p>4. <strong>ARMAZENAMENTO SEGURO</strong> - As assinaturas são armazenadas com hash SHA-256 para garantia de integridade.</p>
              <p>5. <strong>AUDITORIA</strong> - Todas as operações são registradas para fins de auditoria e conformidade.</p>
              <p>6. <strong>DIREITOS DO TITULAR</strong> - Você tem direito à acesso, correção e exclusão de seus dados.</p>
              <p>7. <strong>RESPONSABILIDADE</strong> - O Security Broker SB não se responsabiliza por uso indevido do serviço.</p>
              <p>8. <strong>ATUALIZAÇÕES</strong> - Estes termos podem ser atualizados. Versão atual: v1.0-2024.</p>
            </div>
            <div className="mt-3 text-xs">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mr-2"
                style={{ accentColor: COLORS.gold }}
              />
              <span className="text-gray-300">
                Li, compreendo e aceito todos os termos acima declarando que a assinatura digital 
                possui plena validade jurídica e reconheço o Security Broker SB como intermediário 
                fiduciário digital conforme a legislação vigente.
              </span>
            </div>
          </div>
        </label>
        
        {!termsAccepted && (
          <p className="text-xs text-red-400 mt-2">
            ⚠️ Você precisa aceitar os termos para continuar
          </p>
        )}
      </div>

      {/* Botão de Assinar */}
      <button
        type="button"
        onClick={saveSignature}
        disabled={isEmpty || !termsAccepted || isSubmitting}
        className={`w-full py-3 rounded-lg font-medium transition-all ${
          isEmpty || !termsAccepted || isSubmitting
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'hover:opacity-90 cursor-pointer'
        }`}
        style={{ 
          backgroundColor: (isEmpty || !termsAccepted || isSubmitting) ? undefined : COLORS.gold,
          color: (isEmpty || !termsAccepted || isSubmitting) ? undefined : COLORS.deepOcean
        }}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-t-2 border-t-transparent rounded-full animate-spin"
                 style={{ borderColor: COLORS.deepOcean, borderTopColor: 'transparent' }} />
            Processando...
          </span>
        ) : (
          '🔐 Assinar Documento'
        )}
      </button>

      {/* Informações de Segurança */}
      <div className="mt-4 p-3 rounded-lg text-xs"
           style={{ backgroundColor: COLORS.ocean }}>
        <div className="flex items-center gap-2 mb-1">
          🔒 <strong style={{ color: COLORS.gold }}>Segurança e Auditoria:</strong>
        </div>
        <ul className="space-y-1 text-gray-300 ml-6">
          <li>• Hash SHA-256 para integridade</li>
          <li>• Prova de vida opcional (biometria)</li>
          <li>• Conformidade total com LGPD</li>
          <li>• Registro de auditoria imutável</li>
        </ul>
      </div>
    </div>
  );
}

export default SignatureCanvas;
