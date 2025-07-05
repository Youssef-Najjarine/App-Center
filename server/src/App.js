import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomeNavbarMobile from "./components/HomeNavBar/HomeNavbarMobile";
import HomeNavbarDesktop from "./components/HomeNavBar/HomeNavbarDesktop";
import MemberNavbar from "./components/MemberNavbar/MemberNavbar";
import Footer from "./components/Footer/Footer";
import Home from "./pages/Home/Home";
import Applications from "./pages/Home/Applications/Applications";
import Blogs from "./pages/Home/Blog/Blogs";
import BlogDetails from "./pages/Home/Blog/BlogDetails";
import AboutUs from "./pages/Home/AboutUs/AboutUs";
import ContactUs from "./components/ContactUs/ContactUs";
import UserProfile from "./pages/Profile/userProfile/UserProfile";
import ProfileApplications from "./pages/Profile/ProfileApplications/ProfileApplications";
import EditProfile from "./pages/Profile/userProfile/EditProfile/EditProfile";
import Login from "./pages/Auth/Login/Login";
import SignUp from "./pages/Auth/SignUp/SignUp";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";

const HomeLayout = () => (
  <section className="container">
      <HomeNavbarDesktop />
      <HomeNavbarMobile />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blog/blogDetails" element={<BlogDetails />} />
      </Routes>
      <ContactUs />
    <Footer/>
  </section>
);

const ProfileLayout = () => (
  <section className="container">
    <MemberNavbar/>
    <Routes>
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/profile/apps" element={<ProfileApplications />} />
      <Route path="/profile/edit" element={<EditProfile />} />
    </Routes>
  </section>
);

const AuthLayout = () => (
  <div className="container">
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
    </Routes>
  </div>
);

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<HomeLayout />} />
        <Route path="/profile/*" element={<ProfileLayout />} />
        {/* <Route path="/*" element={<ProfileLayout />} />
        <Route path="/auth/*" element={<AuthLayout />} /> */}
      </Routes>
    </Router>
  );
};

export default App;
