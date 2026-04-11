import axios from 'axios';

const analysisCache = new Map();

export const getCachedAnalysis = (owner, repo, url) => {
  const key = `${owner}/${repo}`;
  if (!analysisCache.has(key)) {
    const promise = axios.get(url).catch(e => {
      analysisCache.delete(key);
      throw e;
    });
    analysisCache.set(key, promise);
  }
  return analysisCache.get(key);
};

export const getAllAnalyzedData = async () => {
  const allData = {};
  for (const [key, promise] of analysisCache.entries()) {
     try {
        const res = await promise;
        allData[key] = res.data;
     } catch(e) {
        // ignore failed analyses
     }
  }
  return allData;
};
