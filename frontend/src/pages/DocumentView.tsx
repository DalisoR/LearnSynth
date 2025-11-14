import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function DocumentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      // Navigate directly to the lesson workspace
      navigate(`/workspace/${id}`);
    }
  }, [id, navigate]);

  return null;
}