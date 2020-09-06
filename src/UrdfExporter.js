import RigidInfo, { JOINT_EFFORT_MAX, JOINT_VELOCITY_MAX } from './RigidInfo';
import XMLWriter from 'xml-writer';
import { createTransform, multiplyTransforms, inverseTransform } from './Transform';
import { quaternionToRollPitchYaw, convertVectorToZUpFrame } from './VecMath';

const PRISM_MESH_NAME = "Prism";
const PRISM_MESH_FILENAME = PRISM_MESH_NAME + ".obj";

class UrdfExporter {
  constructor(shape) {
    this.rigidInfo = new RigidInfo(shape);
    this.wroteLinks = null;
  }

  export(name) {
    this.wroteLinks = [];

    const writer = new XMLWriter();
    writer.startDocument();
    writer.startElement("robot");
    writer.writeAttribute("name", name);

    this.writeRootLinks(writer);

    for (const joint of this.rigidInfo.joints) {
      this.writeJointWithLinks(writer, joint);
    }

    writer.endElement(); // robot
    writer.endDocument();

    return writer.toString();
  }

  vectorToString(vector, precision) {
    const convertedVector = convertVectorToZUpFrame(vector);
    return convertedVector[0].toFixed(precision) + " "
        + convertedVector[1].toFixed(precision) + " "
        + convertedVector[2].toFixed(precision);
  }

  writeVectorAttribute(writer, name, vector, precision) {
    writer.writeAttribute(name, this.vectorToString(vector, precision));
  }

  writeOriginElement(writer, transform) {
    writer.startElement("origin");
    this.writeVectorAttribute(writer, "xyz", transform.position, 6);
    this.writeVectorAttribute(writer, "rpy",
        quaternionToRollPitchYaw(transform.orientation), 4);
    writer.endElement(); // origin
  }

  writeLink(writer, link, joint = undefined) {
    if (this.wroteLinks.some(l => l === link)) {
      return; // already wrote
    }
    writer.startElement("link");
    writer.writeAttribute("name", link.name);
    writer.startElement("inertial");
    let childTransform = createTransform();
    let linkTransform = link.transform;
    if (joint) {
      childTransform = inverseTransform(childTransform, joint.transform);
      linkTransform = multiplyTransforms(createTransform(), childTransform, linkTransform);
    }
    this.writeOriginElement(writer, linkTransform);
    writer.startElement("mass");
    writer.writeAttribute("value", link.mass);
    writer.endElement(); // mass
    writer.startElement("inertia");
    const inertia = convertVectorToZUpFrame(link.inertia);
    writer.writeAttribute("ixx", Math.abs(inertia[0]).toFixed(4));
    writer.writeAttribute("ixy", 0);
    writer.writeAttribute("ixz", 0);
    writer.writeAttribute("iyy", Math.abs(inertia[1]).toFixed(4));
    writer.writeAttribute("iyz", 0);
    writer.writeAttribute("izz", Math.abs(inertia[2]).toFixed(4));
    writer.endElement(); // inertia
    writer.endElement(); // inertial
    for (const transform of link.prismTransforms) {
      const prismTransform = multiplyTransforms(createTransform(), childTransform, transform);
      writer.startElement("collision");
      this.writeOriginElement(writer, prismTransform);
      writer.startElement("geometry");
      writer.startElement("mesh");
      writer.writeAttribute("filename", PRISM_MESH_FILENAME);
      writer.endElement(); // mesh
      writer.endElement(); // geometry
      writer.endElement(); // collision
    }
    writer.endElement(); // link
    this.wroteLinks.push(link);
  }

  writeJoint(writer, joint, parentJoint) {
    writer.startElement("joint");
    writer.writeAttribute("name", joint.name);
    writer.writeAttribute("type", "revolute");
    let jointTransform = joint.transform;
    if (parentJoint) {
      jointTransform = multiplyTransforms(createTransform(),
          inverseTransform(createTransform(), parentJoint.transform), jointTransform);
    }
    this.writeOriginElement(writer, jointTransform);
    writer.startElement("parent");
    writer.writeAttribute("link", joint.baseLink.name);
    writer.endElement(); // parent
    writer.startElement("child");
    writer.writeAttribute("link", joint.targetLink.name);
    writer.endElement(); // child
    writer.startElement("axis");
    writer.writeAttribute("xyz", "1 0 0");
    writer.endElement(); // axis
    writer.startElement("limit");
    writer.writeAttribute("lower", joint.lowerAngle.toFixed(4));
    writer.writeAttribute("upper", joint.upperAngle.toFixed(4));
    writer.writeAttribute("effort", JOINT_EFFORT_MAX);
    writer.writeAttribute("velocity", JOINT_VELOCITY_MAX);
    writer.endElement(); // limit
    writer.endElement(); // joint
  }

  writeRootLinks(writer) {
    this.rigidInfo.links.forEach(link => {
      if (this.rigidInfo.joints.every(joint => joint.targetLink !== link)) {
        this.writeLink(writer, link);
      }
    });
  }

  writeJointWithLinks(writer, joint) {
    const parentJoint = this.rigidInfo.joints.find(j => j.targetLink === joint.baseLink);
    if (parentJoint) {
      this.writeLink(writer, joint.baseLink, parentJoint);
    }
    this.writeLink(writer, joint.targetLink, joint);
    this.writeJoint(writer, joint, parentJoint);
  }
}

export default UrdfExporter;
export { PRISM_MESH_NAME, PRISM_MESH_FILENAME };
