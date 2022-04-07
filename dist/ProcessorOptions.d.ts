import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
/**
 * Options for the Ubi Interact IK and force estimation processing module.
 * All Parameters are optional in the constructor, the default values of
 * the publisher allow connections to a master node at localhost with a
 * configuration made for the process of physical embodiment in VR.
 * In simple usage scenarios, it is not necessary to supply any options.
 * Debugging can be simplified by using {skipUbii} as well as the
 * callbacks {onTargetsReceived}, {onPoseComputed} and
 * {onVelocitiesPublished}.
 */
export interface ProcessorOptions {
    /**
     * The URL for the Ubi Interact services endpoint. Defaults to
     * 'http://localhost:8102/services' if not set. Value has no impact
     * when {skipUbii} is true.
     */
    urlServices: string;
    /**
     * The URL for the Ubi Interact topic data endpoint. Defaults to
     * 'ws://localhost:8104/topicdata' if not set. Value has no impact
     * when {skipUbii} is true.
     */
    urlTopicData: string;
    /**
     * The Ubi Interact topic to which the IK targets will be received at.
     * Defaults to '/avatar/ik_target' if not set. A device will be
     * prepended to the topic if {useDevicePrefixIKTarget} is set to true.
     * Value has no impact when {skipUbii} is true.
     */
    topicIKTargets: string;
    /**
     * Determines whether the Ubi Interact topic for IK should start with
     * the client ID and device prefix. Eg., if the value for
     * {topicIKTargets} is '/avatar/ik_target' and this option is set to
     * true, the full topic could be
     * '/8d23bee1-a6c2-4695-969e-19cf12b313a6/web-ik-forces-processor/avatar/ik_target'.
     * Defaults to false if not set. Value has no impact when {skipUbii}
     * is true.
     */
    useDevicePrefixIKTarget: boolean;
    /**
     * The Ubi Interact topic to which the current pose will be received
     * at. Defaults to '/avatar/current_pose/list' if not set. A device
     * will be prepended to the topic if {useDevicePrefixCurrentPose} is
     * set to true. Value has no impact when {skipUbii} is true.
     */
    topicCurrentPose: string;
    /**
     * Determines whether the Ubi Interact topic for current pose should
     * start with the client ID and device prefix. Eg., if the value for
     * {topicCurrentPose} is 'avatar/current_pose/list' and this option is
     * set to true, the full topic could be
     * '/8d23bee1-a6c2-4695-969e-19cf12b313a6/web-ik-forces-processor/avatar/current_pose/list'.
     * Defaults to false if not set. Value has no impact when {skipUbii}
     * is true.
     */
    useDevicePrefixCurrentPose: boolean;
    /**
     * The Ubi Interact topic to which the calculated velocity will be
     * published to. Defaults to '/avatar/target_velocities' if not set. A
     * device will be prepended to the topic if
     * {useDevicePrefixVelocities} is set to true. Value has no impact when
     * {skipUbii} is true.
     */
    topicVelocities: string;
    /**
     * Determines whether the Ubi Interact topic for velocities should
     * start with the client ID and device prefix. Eg., if the value for
     * {topicVelocities} is '/avatar/target_velocities' and this option is
     * set to true, the full topic could be
     * '/8d23bee1-a6c2-4695-969e-19cf12b313a6/web-ik-forces-processor/avatar/target_velocities'.
     * Defaults to false if not set. Value has no impact when {skipUbii}
     * is true.
     */
    useDevicePrefixVelocities: boolean;
    /**
     * The interval in ms at which the velocities are being published.
     * Some information might be sent one or multiple intervals later if
     * the performance, eg of the callbacks {onTargetsReceived},
     * {onPoseComputed} and {onVelocitiesPublished} functions, is bad.
     * Defaults to 30 if not set.
     */
    publishIntervalMs: number;
    /**
     * Function that returns the received targets. When {skipUbii} is
     * true, this function will not be called. Defaults to an empty
     * function when not set.
     */
    onTargetsReceived: (targets: ProtobufLibrary.ubii.dataStructure.IObject3D[]) => void;
    /**
     * Function that returns the pose as soon as it is computed. When
     * {skipUbii} is true, and targets are added manually, this function
     * will still be called. Defaults to an empty function when not set.
     */
    onPoseComputed: (pose: ProtobufLibrary.ubii.dataStructure.IObject3D[]) => void;
    /**
     * Function that returns the published velocity. This contains exactly
     * the record that is published via Ubi Interact. When {skipUbii} is
     * true, this function will be called despite not sending the record
     * to the master node. Defaults to an empty function when not set.
     */
    onVelocitiesPublished: (record: Partial<ProtobufLibrary.ubii.topicData.TopicDataRecord>) => void;
    /**
     * Ubii needs to be configured with data such as {publishInterval}, a
     * name, ... once. If Ubi Interact is already configured by another
     * module, this option can be set to false. Defaults to true when not
     * set.
     */
    configureInstance: boolean;
    /**
     * Determines whether data should be sent to and received from an
     * master node. Can be set to true for debugging purposes: in that
     * case, no master node would be required, but all other
     * functionality, such as the {onTargetPublished} function, would
     * still work. Defaults to false if not set.
     */
    skipUbii: boolean;
}
