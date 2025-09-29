import React, { useState, useEffect } from 'react';
import { Search, Phone, Calendar, Users, FileText, Plus, Edit2, Save, X, Trash2, MessageCircle, User } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useApp } from '../contexts/AppContext';
import EmptyState from './EmptyState';
import SwipeableListItem from './SwipeableListItem';
import ActionMenu from './ActionMenu';
import PageHeader from './PageHeader';

interface Client {
  cpfcnpj: string;
  nome: string;
  whatsapp: string | null;
  created_at: string;
  numero_cnj?: string | null;
}

interface DisplayClient {
  id: string;
  name: string;
  cpfcnpj: string;
  whatsapp: string;
  createdAt: string;
  numeroCnj: string;
}

export default function ClientFilter() {
  const { dispatch } = useApp();
  const [clients, setClients] = useState<DisplayClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // const [showAddModal, setShowAddModal] = useState(false); // Removido temporariamente
  const [editingWhatsApp, setEditingWhatsApp] = useState<string | null>(null);
  const [whatsappValue, setWhatsappValue] = useState('');
  const itemsPerPage = 10;

  // Função para formatar CPF/CNPJ
  const formatCpfCnpj = (value: string) => {
    if (!value) return value;
    
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Se tem 11 dígitos, é CPF
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    // Se tem 14 dígitos, é CNPJ
    else if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    // Se não tem 11 nem 14 dígitos, retorna como está
    return value;
  };

  // Buscar clientes do Supabase
  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          cpfcnpj, 
          nome, 
          whatsapp, 
          created_at,
          clientes_processos(numero_cnj)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        return;
      }

      // Transformar dados para o formato de exibição
      const displayClients: DisplayClient[] = data.map((client: any) => ({
        id: client.cpfcnpj,
        name: client.nome || 'Nome não informado',
        cpfcnpj: client.cpfcnpj,
        whatsapp: client.whatsapp || 'Não informado',
        createdAt: new Date(client.created_at).toLocaleDateString('pt-BR'),
        numeroCnj: client.clientes_processos?.[0]?.numero_cnj || 'Não informado'
      }));

      setClients(displayClients);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar WhatsApp no Supabase
  const updateWhatsApp = async (cpfcnpj: string, newWhatsApp: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ whatsapp: newWhatsApp || null })
        .eq('cpfcnpj', cpfcnpj);

      if (error) {
        console.error('Erro ao atualizar WhatsApp:', error);
        return false;
      }

      // Atualizar estado local
      setClients(prev => prev.map(client => 
        client.cpfcnpj === cpfcnpj 
          ? { ...client, whatsapp: newWhatsApp || 'Não informado' }
          : client
      ));

      return true;
    } catch (error) {
      console.error('Erro ao atualizar WhatsApp:', error);
      return false;
    }
  };

  // Função para excluir WhatsApp
  const deleteWhatsApp = async (cpfcnpj: string) => {
    return await updateWhatsApp(cpfcnpj, '');
  };

  // Função para iniciar edição
  const startEditingWhatsApp = (clientId: string, currentWhatsApp: string) => {
    setEditingWhatsApp(clientId);
    setWhatsappValue(currentWhatsApp === 'Não informado' ? '' : currentWhatsApp);
  };

  // Função para salvar WhatsApp
  const saveWhatsApp = async (cpfcnpj: string) => {
    const success = await updateWhatsApp(cpfcnpj, whatsappValue.trim());
    if (success) {
      setEditingWhatsApp(null);
      setWhatsappValue('');
    }
  };

  // Função para cancelar edição
  const cancelEditingWhatsApp = () => {
    setEditingWhatsApp(null);
    setWhatsappValue('');
  };

  // Carregar clientes ao montar o componente
  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.cpfcnpj.includes(searchTerm) ||
                         client.whatsapp.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.numeroCnj.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  // Reset página quando filtro muda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Função para recarregar clientes após cadastro - removida temporariamente
  // const handleClientAdded = () => {
  //   fetchClients();
  // };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center items-center py-12">
          <div className="spinner h-8 w-8"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Carregando clientes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader 
          icon={Users}
          title="Clientes Cadastrados"
          subtitle="Lista de clientes do sistema"
        >
          <button
            onClick={() => alert('Funcionalidade em desenvolvimento')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Adicionar Cliente
          </button>
        </PageHeader>

      {/* Filtros e Busca */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              {!isSearchFocused && (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
              )}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Buscar por nome, CPF/CNPJ, WhatsApp ou número CNJ..."
                className="input-primary input-search transition-all duration-200"
                style={{ paddingLeft: isSearchFocused ? '20px' : '34px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Clientes Cadastrados ({filteredClients.length})
          </h3>
        </div>
        
        {currentClients.length === 0 && filteredClients.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum cliente encontrado"
            description="Nenhum cliente encontrado com os filtros aplicados. Tente ajustar os critérios de busca."
            action={{
              label: 'Limpar Filtros',
              onClick: () => {
                setSearchTerm('');
              }
            }}
          />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum cliente encontrado"
            description="Nenhum cliente encontrado com os filtros aplicados. Tente ajustar os critérios de busca."
            action={{
              label: 'Limpar Filtros',
              onClick: () => {
                setSearchTerm('');
              }
            }}
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentClients.map((client) => (
              <SwipeableListItem
                key={client.id}
                onEdit={() => startEditingWhatsApp(client.id, client.whatsapp)}
                onDelete={() => deleteWhatsApp(client.cpfcnpj)}
              >
                <div className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="avatar">
                        <User className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {client.name}
                        </h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" strokeWidth={1.5} />
                            {formatCpfCnpj(client.cpfcnpj)}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" strokeWidth={1.5} />
                            {client.createdAt}
                          </span>
                          <span className="flex items-center">
                            <Scale className="h-4 w-4 mr-1" strokeWidth={1.5} />
                            {client.numeroCnj}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {editingWhatsApp === client.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={whatsappValue}
                            onChange={(e) => setWhatsappValue(e.target.value)}
                            placeholder="WhatsApp"
                            className="input-primary w-32 h-8 text-sm"
                          />
                          <button
                            onClick={() => saveWhatsApp(client.cpfcnpj)}
                            className="btn-icon text-green-600 hover:text-green-700"
                          >
                            <Save className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={cancelEditingWhatsApp}
                            className="btn-icon text-gray-600 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <Phone className="h-4 w-4 mr-1" strokeWidth={1.5} />
                            {client.whatsapp}
                          </span>
                          <button
                            onClick={() => startEditingWhatsApp(client.id, client.whatsapp)}
                            className="btn-icon text-gray-600 hover:text-gray-700"
                          >
                            <Edit2 className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      )}
                      <ActionMenu
                        items={[
                          {
                            label: 'Editar WhatsApp',
                            icon: Edit2,
                            onClick: () => startEditingWhatsApp(client.id, client.whatsapp)
                          },
                          {
                            label: 'Remover WhatsApp',
                            icon: Trash2,
                            onClick: () => deleteWhatsApp(client.cpfcnpj),
                            variant: 'danger'
                          }
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </SwipeableListItem>
            ))}
          </div>
        )}
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredClients.length)} de {filteredClients.length} clientes
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-ghost px-3 py-1 disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-ghost px-3 py-1 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}