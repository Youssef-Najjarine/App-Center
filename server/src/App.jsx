import React from "react";
import { BrowserRouter as Router, Route, Routes, Outlet } from "react-router-dom";
import HomeNavbarMobile from "@components/HomeNavBar/HomeNavbarMobile";
import HomeNavbarDesktop from "@components/HomeNavBar/HomeNavbarDesktop";
import MemberNavbarMobile from "@components/MemberNavbar/MemberNavbarMobile";
import MemberNavbarDesktop from "@components/MemberNavbar/MemberNavbarDesktop";
import Footer from "@components/Footer/Footer";
import Home from "@pages/Home/Home";
import Applications from "@pages/Home/Applications/Applications";
import Blogs from "@pages/Home/Blog/Blogs";
import BlogDetails from "@pages/Home/Blog/BlogDetails";
import AboutUs from "@pages/Home/AboutUs/AboutUs";
import ContactUs from "@components/ContactUs/ContactUs";
import UserProfile from "@pages/Profile/userProfile/UserProfile";
import ProfileApplications from "@pages/Profile/ProfileApplications/ProfileApplications";
import ProfileApplicationDrafts from "@profile/ProfileApplicationDrafts/ProfileApplicationDrafts";
import AppManagement from "@pages/Profile/AppManagement/AppManagement";
import EditProfile from "@pages/Profile/userProfile/EditProfile/EditProfile";
import MyPurchases from "@pages/Profile/MyPurchases/MyPurchases";
import ApplicationHistory from "@pages/Profile/ApplicationHistory/ApplicationHistory";
import CardsPayments from "@pages/Profile/CardsPayments/CardsPayments";
import EarningsPayouts from "@pages/Profile/Earnings&Payouts/Earnings&Payouts";
import ManagePayoutMethods from "@pages/Profile/Earnings&Payouts/ManagePayoutMethods/ManagePayoutMethods";
import Login from "@pages/Auth/Login/Login";
import SignUp from "@pages/Auth/SignUp/SignUp";
import VerifyIdentity from "@pages/Auth/VerifyIdentity/VerifyIdentity";
import ForgotPassword from "@pages/Auth/ForgotPassword/ForgotPassword";
import CreateNewPassword from "@pages/Auth/CreateNewPassword/CreateNewPassword";

const HomeLayout = () => (
  <section className="container">
    <HomeNavbarDesktop />
    <HomeNavbarMobile />
    <Outlet />
    <ContactUs />
    <Footer />
  </section>
);

const ProfileLayout = () => (
  <section className="container">
    <MemberNavbarDesktop/>
    <MemberNavbarMobile />
    <Outlet />
  </section>
);

const AuthLayout = () => (
  <div className="container">
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/verify-identity" element={<VerifyIdentity />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/create-new-password" element={<CreateNewPassword />} />
    </Routes>
  </div>
);

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Home Layout */}
        <Route path="/" element={<HomeLayout />}>
          <Route index element={<Home />} />
          <Route path="applications" element={<Applications />} />
          <Route path="about-us" element={<AboutUs />} />
          <Route path="blogs" element={<Blogs />} />
          <Route path="blog/blogDetails" element={<BlogDetails />} />
        </Route>

        {/* Profile Layout */}
        <Route path="/profile" element={<ProfileLayout />}>
          <Route index element={<UserProfile />} />
          <Route path="apps" element={<ProfileApplications />} />
          <Route path="drafts" element={<ProfileApplicationDrafts />} />
          <Route path="appManagement" element={<AppManagement />} />
          <Route path="MyPurchases" element={<MyPurchases />} />
          <Route path="ApplicationHistory" element={<ApplicationHistory/>}/>
          <Route path="Earnings&Payouts" element={<EarningsPayouts/>}/>
          <Route path="ManagePayoutMethods" element={<ManagePayoutMethods/>}/>
          <Route path="CardsPayments" element={<CardsPayments/>}/>
          <Route path="edit" element={<EditProfile />} />
        </Route>

        {/* Auth Layout */}
        <Route path="/auth/*" element={<AuthLayout />} />
      </Routes>
    </Router>
  );
};

export default App;
