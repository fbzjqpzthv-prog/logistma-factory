/**
 * LogisTMA Factory — deployer.js
 * Déploiement automatisé sur Railway via l'API GraphQL.
 * Crée un projet isolé par tenant avec backend Node.js + frontend static.
 */

import axios from 'axios';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';
const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;
const RAILWAY_TEAM_ID = process.env.RAILWAY_TEAM_ID;

// ═══════════════════════════════════════
// CLIENT GRAPHQL RAILWAY
// ═══════════════════════════════════════

async function railwayQuery(query, variables = {}) {
  if (!RAILWAY_API_TOKEN) {
    throw new Error('RAILWAY_API_TOKEN non configuré');
  }

  try {
    const response = await axios.post(
      RAILWAY_API_URL,
      { query, variables },
      {
        headers: {
          'Authorization': `Bearer ${RAILWAY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data.errors?.length) {
      const errorMsg = response.data.errors.map(e => e.message).join('; ');
      throw new Error(`Railway GraphQL Error: ${errorMsg}`);
    }

    return response.data.data;
  } catch (err) {
    if (err.response?.data) {
      logger.error({ railwayError: err.response.data }, 'Railway API error');
    }
    throw err;
  }
}

// ═══════════════════════════════════════
// CRÉATION PROJET RAILWAY
// ═══════════════════════════════════════

async function createRailwayProject(tenantId) {
  const mutation = `
    mutation ProjectCreate($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        id
        name
        createdAt
      }
    }
  `;

  const data = await railwayQuery(mutation, {
    input: {
      name: `logistma-${tenantId}`,
      description: `LogisTMA tenant: ${tenantId}`,
      ...(RAILWAY_TEAM_ID ? { teamId: RAILWAY_TEAM_ID } : {}),
    },
  });

  const project = data.projectCreate;
  logger.info({ projectId: project.id, tenantId }, 'Railway project created');
  return project;
}

// ═══════════════════════════════════════
// CONFIGURATION VARIABLES D'ENVIRONNEMENT
// ═══════════════════════════════════════

async function setEnvironmentVariables(projectId, serviceId, envVars) {
  const mutation = `
    mutation VariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `;

  // Convertir en format Railway
  const variables = Object.entries(envVars).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});

  await railwayQuery(mutation, {
    input: {
      projectId,
      serviceId,
      environmentId: await getProductionEnvironmentId(projectId),
      variables,
    },
  });

  logger.info({ projectId, serviceId, varsCount: Object.keys(envVars).length }, 'Environment variables set');
}

async function getProductionEnvironmentId(projectId) {
  const query = `
    query GetEnvironments($projectId: String!) {
      project(id: $projectId) {
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  `;

  const data = await railwayQuery(query, { projectId });
  const envs = data.project.environments.edges;
  const prod = envs.find(e => e.node.name === 'production') || envs[0];

  if (!prod) throw new Error(`Aucun environnement trouvé pour le projet ${projectId}`);
  return prod.node.id;
}

// ═══════════════════════════════════════
// DÉPLOIEMENT BACKEND (Node.js Web Service)
// ═══════════════════════════════════════

async function deployBackendService(projectId, repoPath, tenantId, envVars) {
  // Créer le service backend
  const createMutation = `
    mutation ServiceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) {
        id
        name
        createdAt
      }
    }
  `;

  const serviceData = await railwayQuery(createMutation, {
    input: {
      projectId,
      name: `${tenantId}-backend`,
      source: {
        // Si le repo est un dossier local, on utilise l'upload direct
        // Sinon on peut pointer vers un repo GitHub
        repo: process.env.TEMPLATE_GITHUB_REPO || null,
      },
    },
  });

  const backendService = serviceData.serviceCreate;
  logger.info({ serviceId: backendService.id, tenantId }, 'Backend service created');

  // Variables d'environnement
  await setEnvironmentVariables(projectId, backendService.id, {
    ...envVars,
    PORT: '3000',
    NODE_ENV: 'production',
  });

  // Configuration du service
  const configMutation = `
    mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }
  `;

  const envId = await getProductionEnvironmentId(projectId);
  await railwayQuery(configMutation, {
    serviceId: backendService.id,
    environmentId: envId,
    input: {
      startCommand: 'node src/server.js',
      buildCommand: 'npm install --production',
      healthcheckPath: '/health',
      healthcheckTimeout: 30,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 3,
    },
  });

  return backendService;
}

// ═══════════════════════════════════════
// DÉPLOIEMENT FRONTEND (Static Site)
// ═══════════════════════════════════════

async function deployFrontendService(projectId, repoPath, tenantId) {
  const createMutation = `
    mutation ServiceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) {
        id
        name
        createdAt
      }
    }
  `;

  const serviceData = await railwayQuery(createMutation, {
    input: {
      projectId,
      name: `${tenantId}-frontend`,
      source: {
        repo: process.env.TEMPLATE_GITHUB_REPO || null,
      },
    },
  });

  const frontendService = serviceData.serviceCreate;
  logger.info({ serviceId: frontendService.id, tenantId }, 'Frontend service created');

  // Config static site
  const envId = await getProductionEnvironmentId(projectId);
  const configMutation = `
    mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }
  `;

  await railwayQuery(configMutation, {
    serviceId: frontendService.id,
    environmentId: envId,
    input: {
      buildCommand: 'npm install && npm run build',
      startCommand: 'npx serve dist -l 80 --no-clipboard',
    },
  });

  return frontendService;
}

// ═══════════════════════════════════════
// RÉCUPÉRATION DES URLS
// ═══════════════════════════════════════

async function getServiceUrl(projectId, serviceId, maxAttempts = 20, delayMs = 5000) {
  const query = `
    query ServiceDomains($projectId: String!, $serviceId: String!, $environmentId: String!) {
      domains(projectId: $projectId, serviceId: $serviceId, environmentId: $environmentId) {
        serviceDomains {
          domain
        }
      }
    }
  `;

  const envId = await getProductionEnvironmentId(projectId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await railwayQuery(query, { projectId, serviceId, environmentId: envId });
      const domains = data.domains?.serviceDomains || [];

      if (domains.length > 0) {
        const url = `https://${domains[0].domain}`;
        logger.info({ serviceId, url, attempt }, 'Service URL obtained');
        return url;
      }
    } catch (err) {
      logger.warn({ err: err.message, attempt }, 'Failed to get service URL');
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Impossible d'obtenir l'URL du service ${serviceId} après ${maxAttempts} tentatives`);
}

// ═══════════════════════════════════════
// DÉCLENCHEMENT DU DÉPLOIEMENT
// ═══════════════════════════════════════

async function triggerDeploy(projectId, serviceId) {
  const mutation = `
    mutation DeploymentCreate($input: DeploymentCreateInput!) {
      deploymentCreate(input: $input) {
        id
        status
        createdAt
      }
    }
  `;

  const envId = await getProductionEnvironmentId(projectId);
  const data = await railwayQuery(mutation, {
    input: {
      projectId,
      serviceId,
      environmentId: envId,
    },
  });

  logger.info({ deploymentId: data.deploymentCreate.id, serviceId }, 'Deployment triggered');
  return data.deploymentCreate;
}

// ═══════════════════════════════════════
// SUPPRESSION D'UN PROJET (tenant deleted)
// ═══════════════════════════════════════

export async function deleteRailwayProject(railwayProjectId) {
  const mutation = `
    mutation ProjectDelete($id: String!) {
      projectDelete(id: $id)
    }
  `;

  await railwayQuery(mutation, { id: railwayProjectId });
  logger.info({ railwayProjectId }, 'Railway project deleted');
}

// ═══════════════════════════════════════
// MISE À JOUR VARIABLE D'ENVIRONNEMENT
// ═══════════════════════════════════════

export async function updateRailwayEnvVar(projectId, serviceId, key, value) {
  await setEnvironmentVariables(projectId, serviceId, { [key]: value });
}

// ═══════════════════════════════════════
// STATUT D'UN DÉPLOIEMENT
// ═══════════════════════════════════════

export async function getRailwayDeploymentStatus(projectId) {
  const query = `
    query ProjectDeployments($projectId: String!) {
      deployments(input: { projectId: $projectId }) {
        edges {
          node {
            id
            status
            createdAt
            staticUrl
          }
        }
      }
    }
  `;

  const data = await railwayQuery(query, { projectId });
  return data.deployments.edges.map(e => e.node);
}

// ═══════════════════════════════════════
// DÉPLOIEMENT COMPLET (FONCTION PRINCIPALE)
// ═══════════════════════════════════════

/**
 * Déploie un tenant sur Railway.
 * Crée un projet isolé avec backend + frontend.
 *
 * @param {string} repoPath - Chemin local du repo cloné et configuré
 * @param {string} tenantId
 * @param {Object} envVars  - Variables d'environnement à injecter
 * @returns {Object} { projectId, backendUrl, frontendUrl, backendServiceId, frontendServiceId }
 */
export async function deployToRailway(repoPath, tenantId, envVars) {
  logger.info({ tenantId }, 'Starting Railway deployment');

  // Mock pour développement local (sans token Railway configuré)
  if (!RAILWAY_API_TOKEN || RAILWAY_API_TOKEN === 'mock') {
    logger.warn({ tenantId }, 'RAILWAY_API_TOKEN not set — using mock deployment');
    await new Promise(r => setTimeout(r, 2000)); // Simuler le délai
    return {
      projectId: `mock-project-${tenantId}`,
      backendUrl: `https://api-${tenantId}.up.railway.app`,
      frontendUrl: `https://app-${tenantId}.up.railway.app`,
      backendServiceId: `mock-backend-${tenantId}`,
      frontendServiceId: `mock-frontend-${tenantId}`,
    };
  }

  // 1. Créer le projet Railway
  const project = await createRailwayProject(tenantId);

  // 2. Déployer le backend
  const backendService = await deployBackendService(project.id, repoPath, tenantId, envVars);

  // 3. Déployer le frontend
  const frontendService = await deployFrontendService(project.id, repoPath, tenantId);

  // 4. Déclencher les déploiements
  await triggerDeploy(project.id, backendService.id);
  await triggerDeploy(project.id, frontendService.id);

  // 5. Attendre les URLs (Railway les génère automatiquement)
  logger.info({ tenantId }, 'Waiting for Railway service URLs');
  const [backendUrl, frontendUrl] = await Promise.all([
    getServiceUrl(project.id, backendService.id),
    getServiceUrl(project.id, frontendService.id),
  ]);

  // 6. Mettre à jour WEBHOOK_URL et MINI_APP_URL dans le backend
  await setEnvironmentVariables(project.id, backendService.id, {
    WEBHOOK_URL: `${backendUrl}/webhook/${tenantId}`,
    MINI_APP_URL: frontendUrl,
  });

  logger.info(
    { tenantId, backendUrl, frontendUrl, projectId: project.id },
    'Railway deployment completed'
  );

  return {
    projectId: project.id,
    backendUrl,
    frontendUrl,
    backendServiceId: backendService.id,
    frontendServiceId: frontendService.id,
  };
}

export default { deployToRailway, deleteRailwayProject, updateRailwayEnvVar, getRailwayDeploymentStatus };
