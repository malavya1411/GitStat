import React from 'react';
import { useParams } from 'react-router-dom';
import RepoLayout from '../components/RepoLayout';
import Architecture from '../components/Architecture';

const DeepAnalysisPage = () => {
  const { owner, repo } = useParams();

  return (
    <RepoLayout>
      <div className="max-w-6xl mx-auto">
        <Architecture owner={owner} repo={repo} />
      </div>
    </RepoLayout>
  );
};

export default DeepAnalysisPage;
