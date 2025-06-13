import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomeNavbarMobile from "./components/HomeNavBar/HomeNavbarMobile";
import HomeNavbarDesktop from "./components/HomeNavBar/HomeNavbarDesktop";
import ProfileNavbar from "./components/ProfileNavbar";
import Footer from "./components/Footer/Footer";
import Home from "./pages/Home/Home";
import Applications from "./pages/Home/Applications/Applications";
import Blog from "./pages/Home/Blog/Blog";
import BlogDetails from "./pages/Home/Blog/BlogDetails";
import AboutUs from "./pages/Home/AboutUs/AboutUs";
import ContactUs from "./components/ContactUs/ContactUs";
import UserProfile from "./features/profile/UserProfile";
import AppList from "./features/profile/AppList";
import EditProfile from "./features/profile/EditProfile";
import CreateApp from "./features/profile/CreateApp";
import EditApp from "./features/profile/EditApp";
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
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/edit" element={<BlogDetails />} />
        <Route path="/about-us" element={<AboutUs />} />
      </Routes>
      <ContactUs />
    <Footer/>
  </section>
);

const ProfileLayout = () => (
  <>
    <ProfileNavbar />
    <Routes>
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/profile/apps" element={<AppList />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/profile/apps/new" element={<CreateApp />} />
      <Route path="/profile/apps/edit/:appId" element={<EditApp />} />
    </Routes>
  </>
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
        <Route path="/auth/*" element={<AuthLayout />} />
      </Routes>
    </Router>
  );
};

export default App;
