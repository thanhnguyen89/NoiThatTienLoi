'use client';

import { useCallback, useEffect, useState } from 'react';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  label?: string;
  variant?: 'cards' | 'select';
}

export default function ModelPicker({ value, onChange, size = 'md', label = 'AI Model', variant = 'cards' }: Props) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-models?activeOnly=true');
      const json = await res.json();
      if (json.success) {
        setModels(json.data);
        
        // Auto-select default model if no value selected
        if (!value && json.data.length > 0) {
          const defaultModel = json.data.find((m: AIModel) => m.isDefault);
          if (defaultModel) {
            onChange(defaultModel.modelId);
          } else {
            onChange(json.data[0].modelId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  }, [onChange, value]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  if (loading) {
    return (
      <div>
        {label && (
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
        )}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 w-32 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div>
        {label && (
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
        )}
        <div className="text-sm text-gray-400 py-4">
          Chưa có AI model nào. Vui lòng cấu hình tại{' '}
          <a href="/cau-hinh/ai-models" className="text-blue-600 underline">
            Quản Lý AI Models
          </a>
        </div>
      </div>
    );
  }

  if (variant === 'select') {
    const selectedModel = models.find((model) => model.modelId === value) ?? models.find((model) => model.isDefault) ?? models[0];

    return (
      <div>
        {label && (
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
        )}
        <select
          value={selectedModel?.modelId ?? ''}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {models.map((model) => (
            <option key={model.id} value={model.modelId}>
              {model.name} - {model.provider}
            </option>
          ))}
        </select>
        {selectedModel && (
          <p className="mt-1.5 text-xs text-gray-500">
            {selectedModel.description || `${selectedModel.provider} - ${selectedModel.modelId}`}
          </p>
        )}
      </div>
    );
  }

  // Color mapping based on provider
  const getColorClass = (provider: string, isActive: boolean) => {
    const colors: Record<string, { active: string; ring: string; dot: string }> = {
      gemini: {
        active: 'border-blue-500 bg-blue-50 text-blue-700',
        ring: 'ring-blue-400',
        dot: 'bg-blue-500',
      },
      openai: {
        active: 'border-green-500 bg-green-50 text-green-700',
        ring: 'ring-green-400',
        dot: 'bg-green-500',
      },
      grok: {
        active: 'border-orange-500 bg-orange-50 text-orange-700',
        ring: 'ring-orange-400',
        dot: 'bg-orange-500',
      },
      anthropic: {
        active: 'border-purple-500 bg-purple-50 text-purple-700',
        ring: 'ring-purple-400',
        dot: 'bg-purple-500',
      },
    };

    const color = colors[provider.toLowerCase()] || colors.gemini;
    return isActive ? color.active : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white';
  };

  const getDotColor = (provider: string) => {
    const colors: Record<string, string> = {
      gemini: 'bg-blue-500',
      openai: 'bg-green-500',
      grok: 'bg-orange-500',
      anthropic: 'bg-purple-500',
    };
    return colors[provider.toLowerCase()] || 'bg-gray-500';
  };

  return (
    <div>
      {label && (
        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
      )}
      <div className="flex gap-2 flex-wrap">
        {models.map((model) => {
          const isActive = value === model.modelId;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onChange(model.modelId)}
              className={`flex items-center gap-1.5 border-2 rounded-lg transition-all ${
                size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2'
              } ${getColorClass(model.provider, isActive)} ${
                isActive ? 'shadow-sm' : ''
              }`}
            >
              <span className={size === 'sm' ? 'text-base' : 'text-lg'}>
                {model.icon || '🤖'}
              </span>
              <div className="text-left">
                <p className={`font-semibold leading-none ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                  {model.name}
                </p>
                {size === 'md' && (
                  <p className={`text-xs mt-0.5 ${isActive ? 'opacity-70' : 'text-gray-400'}`}>
                    {model.description || model.provider}
                  </p>
                )}
              </div>
              {isActive && (
                <span className={`ml-1 w-1.5 h-1.5 rounded-full ${getDotColor(model.provider)}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
