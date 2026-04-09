import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminBlogForm from "@pages/Admin/AdminBlogForm/AdminBlogForm";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";

const AdminBlogEdit = () => {
  const { blogId } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await fetch(`/api/admin/blog/${blogId}`, { credentials: "include" });
        const data = await res.json();

        if (!res.ok || !data?.blog) {
          navigate("/admin/blogs", { replace: true });
          return;
        }

        const blog = data.blog;
        const sections = blog.sections || [];

        const textSections = sections.filter((s) => s.sectionType === 0);
        const headingSections = sections.filter((s) => s.sectionType === 2);
        const imageSections = sections.filter((s) => s.sectionType === 1);

        setInitialData({
          id: blog.id,
          title: blog.title,
          tag: blog.tag,
          isPublished: blog.isPublished,
          isFeatured: blog.isFeatured,
          section1Text: textSections[0]?.textContent ?? "",
          section2Heading: headingSections[0]?.textContent ?? "",
          section2Text: textSections[1]?.textContent ?? "",
          heroImageUrl: imageSections[0]?.imageUrl ?? "",
          image2Url: imageSections[1]?.imageUrl ?? "",
          image3Url: imageSections[2]?.imageUrl ?? "",
          image4Url: imageSections[3]?.imageUrl ?? "",
        });
      } catch {
        navigate("/admin/blogs", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [blogId, navigate]);

  if (loading) return <ProcessingModal modalOpenState={true} message="Loading blog..." />;
  if (!initialData) return null;

  return <AdminBlogForm mode="edit" initialData={initialData} />;
};

export default AdminBlogEdit;