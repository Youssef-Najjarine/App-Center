import React from 'react';
import { useParams } from 'react-router-dom';

const EditAppForm = () => {
  const { appId } = useParams();
  return <div>Edit App with ID: {appId}</div>;
};

export default EditAppForm;